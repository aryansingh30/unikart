package com.unikart.auth;

import com.unikart.admin.LifecycleScheduledTasks;
import com.unikart.borrow.BorrowRecord;
import com.unikart.borrow.BorrowRecordRepository;
import com.unikart.borrow.Fine;
import com.unikart.borrow.FineRepository;
import com.unikart.catalog.Copy;
import com.unikart.catalog.CopyRepository;
import com.unikart.common.BusinessException;
import com.unikart.institution.Institution;
import com.unikart.institution.InstitutionRepository;
import com.unikart.institution.Store;
import com.unikart.institution.StoreRepository;
import com.unikart.order.OrderLine;
import com.unikart.order.StoreOrder;
import com.unikart.order.StoreOrderRepository;
import com.unikart.wallet.Wallet;
import com.unikart.wallet.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthAndLifecycleServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private LifecycleScheduledTasks lifecycleTasks;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private StoreOrderRepository storeOrderRepository;

    @Autowired
    private com.unikart.order.CheckoutRepository checkoutRepository;

    @Autowired
    private com.unikart.order.OrderLineRepository orderLineRepository;

    @Autowired
    private BorrowRecordRepository borrowRecordRepository;

    @Autowired
    private FineRepository fineRepository;

    @Autowired
    private CopyRepository copyRepository;

    @Autowired
    private com.unikart.catalog.ItemRepository itemRepository;

    @Autowired
    private com.unikart.catalog.ListingRepository listingRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Institution testInst;
    private Store testStore;
    private com.unikart.catalog.Item testItem;
    private com.unikart.catalog.Listing testListing;
    private User testCustomer;
    private User testManager;

    @BeforeEach
    void setUp() {
        testInst = institutionRepository.save(Institution.builder()
                .code("MNNIT_TEST")
                .name("MNNIT Allahabad Test")
                .emailDomain("mnnit.ac.in")
                .city("Prayagraj")
                .state("UP")
                .address("Teliarganj")
                .status("ACTIVE")
                .build());

        testStore = storeRepository.save(Store.builder()
                .institution(testInst)
                .storeCode("MNNIT_TEST_STORE")
                .name("Test Campus Store")
                .locationDetails("SAC Building")
                .operatingHours("Mon-Sat 9-6")
                .status("ACTIVE")
                .build());

        testItem = itemRepository.save(com.unikart.catalog.Item.builder()
                .title("Test Book")
                .author("Test Author")
                .isbnOrCode("978-TEST-" + UUID.randomUUID())
                .category("BOOK")
                .subject("Computer Science")
                .courseCode("CS101")
                .baseValue(new BigDecimal("500.00"))
                .status("ACTIVE")
                .build());

        testListing = listingRepository.save(com.unikart.catalog.Listing.builder()
                .item(testItem)
                .store(testStore)
                .listingType("BUY_AND_BORROW")
                .salePrice(new BigDecimal("500.00"))
                .baseItemValue(new BigDecimal("500.00"))
                .borrowFeePct14d(new BigDecimal("10.00"))
                .borrowFeePct30d(new BigDecimal("18.00"))
                .borrowFeePct45d(new BigDecimal("25.00"))
                .depositPct(new BigDecimal("50.00"))
                .status("ACTIVE")
                .build());

        testCustomer = userRepository.save(User.builder()
                .institution(testInst)
                .institutionalId("2026TEST01")
                .fullName("Test Student")
                .email("student@mnnit.ac.in")
                .phone("+91 98765 00001")
                .passwordHash(passwordEncoder.encode("SecurePass123!"))
                .role("CUSTOMER")
                .designation("STUDENT")
                .status("ACTIVE")
                .twoFactorEnabled(false)
                .build());

        walletRepository.save(Wallet.builder()
                .user(testCustomer)
                .availableBalance(new BigDecimal("1000.00"))
                .reservedBalance(BigDecimal.ZERO)
                .currency("INR")
                .build());

        testManager = userRepository.save(User.builder()
                .institution(testInst)
                .assignedStore(testStore)
                .institutionalId("MGR01")
                .fullName("Test Manager")
                .email("manager@unikart.in")
                .phone("+91 98765 00002")
                .passwordHash(passwordEncoder.encode("ManagerPass123!"))
                .role("STORE_MANAGER")
                .designation("STAFF")
                .status("ACTIVE")
                .twoFactorEnabled(true)
                .build());
    }

    @Test
    @DisplayName("AUTH-02: Customer login with valid password returns active JWT token and profile")
    void customerLoginSuccess() {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("student@mnnit.ac.in", "SecurePass123!");
        AuthDtos.LoginResponse res = authService.login(req, "127.0.0.1");

        assertThat(res.getToken()).isNotBlank();
        assertThat(res.isRequires2Fa()).isFalse();
        assertThat(res.getUser()).isNotNull();
        assertThat(res.getUser().getEmail()).isEqualTo("student@mnnit.ac.in");
        assertThat(res.getUser().getRole()).isEqualTo("CUSTOMER");
        assertThat(res.getUser().getWalletBalance()).isEqualByComparingTo("1000.00");
    }

    @Test
    @DisplayName("AUTH-03: Invalid password fails login and increments failed attempts")
    void invalidPasswordFails() {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("student@mnnit.ac.in", "WrongPassword!");

        assertThatThrownBy(() -> authService.login(req, "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid email or password");

        User updated = userRepository.findByEmailIgnoreCase("student@mnnit.ac.in").orElseThrow();
        assertThat(updated.getFailedLoginAttempts()).isEqualTo(1);
    }

    @Test
    @DisplayName("AUTH-07: Staff login triggers 2FA and generates short-lived temp token")
    void staffLoginTriggers2Fa() {
        AuthDtos.LoginRequest req = new AuthDtos.LoginRequest("manager@unikart.in", "ManagerPass123!");
        AuthDtos.LoginResponse res = authService.login(req, "127.0.0.1");

        assertThat(res.isRequires2Fa()).isTrue();
        assertThat(res.getTempToken()).isNotBlank();
        assertThat(res.getToken()).isNull();
        assertThat(res.getMessage()).contains("Two-factor authentication code sent");
    }

    @Test
    @DisplayName("AUTH-01: Registration with invalid institution domain is rejected")
    void registerInvalidDomainRejected() {
        AuthDtos.RegisterRequest req = new AuthDtos.RegisterRequest(
                "MNNIT_TEST", "2026TEST99", "Fake User", "fake@gmail.com", "+91 90000 11111", "ValidPass123!", "STUDENT"
        );

        assertThatThrownBy(() -> authService.register(req, "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Email must belong to institution domain");
    }

    @Test
    @DisplayName("AUTH-01: Registration with valid institutional domain initializes customer account and wallet")
    void registerValidStudentSuccess() {
        AuthDtos.RegisterRequest req = new AuthDtos.RegisterRequest(
                "MNNIT_TEST", "2026TEST02", "New Student", "newstudent@mnnit.ac.in", "+91 90000 22222", "ValidPass123!", "STUDENT"
        );

        AuthDtos.LoginResponse res = authService.register(req, "127.0.0.1");
        assertThat(res.getToken()).isNotBlank();
        assertThat(res.getUser().getEmail()).isEqualTo("newstudent@mnnit.ac.in");

        User saved = userRepository.findByEmailIgnoreCase("newstudent@mnnit.ac.in").orElseThrow();
        Wallet wallet = walletRepository.findByUser_UserId(saved.getUserId()).orElseThrow();
        assertThat(wallet.getAvailableBalance()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("FUL-02: Self-pickup expiry auto-cancels order, restocks copy, and refunds deposit minus 10% fee")
    void pickupExpiryCancelsAndRefunds() {
        Copy copy = copyRepository.save(Copy.builder()
                .copyCode("CP-TEST-EXP-01")
                .item(testItem)
                .store(testStore)
                .condition("GOOD")
                .status("ALLOCATED")
                .allowedForBorrow(true)
                .allowedForSale(true)
                .build());

        com.unikart.order.Checkout checkout = checkoutRepository.save(com.unikart.order.Checkout.builder()
                .checkoutNumber("CK-TEST-001")
                .user(testCustomer)
                .idempotencyKey("IDEMP-CK-001")
                .status("CONFIRMED")
                .build());

        StoreOrder order = storeOrderRepository.save(StoreOrder.builder()
                .orderNumber("SO-TEST-EXP-01")
                .checkout(checkout)
                .user(testCustomer)
                .store(testStore)
                .fulfilmentType("SELF_PICKUP")
                .status("READY_FOR_PICKUP")
                .pickupReadyAt(Instant.now().minus(8, ChronoUnit.DAYS))
                .pickupDeadlineAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .depositAmount(new BigDecimal("500.00"))
                .subtotalAmount(new BigDecimal("100.00"))
                .totalAmount(new BigDecimal("600.00"))
                .build());

        OrderLine line = orderLineRepository.save(OrderLine.builder()
                .storeOrder(order)
                .listing(testListing)
                .item(testItem)
                .lineType("BORROW")
                .allocatedCopy(copy)
                .depositAmount(new BigDecimal("500.00"))
                .lineAmount(new BigDecimal("100.00"))
                .unitItemValue(new BigDecimal("500.00"))
                .totalLineAmount(new BigDecimal("600.00"))
                .status("ALLOCATED")
                .build());
        order.getLines().add(line);
        storeOrderRepository.save(order);

        int processed = lifecycleTasks.processPickupExpiry();
        assertThat(processed).isGreaterThanOrEqualTo(1);

        StoreOrder updatedOrder = storeOrderRepository.findById(order.getStoreOrderId()).orElseThrow();
        assertThat(updatedOrder.getStatus()).isEqualTo("CANCELLED");
        assertThat(updatedOrder.getCancellationReason()).contains("Self-pickup window expired");

        Copy restockedCopy = copyRepository.findById(copy.getCopyId()).orElseThrow();
        assertThat(restockedCopy.getStatus()).isEqualTo("AVAILABLE");

        // 10% fee deducted from ₹500 deposit = ₹50 fee, ₹450 refunded to wallet
        Wallet updatedWallet = walletRepository.findByUser_UserId(testCustomer.getUserId()).orElseThrow();
        assertThat(updatedWallet.getAvailableBalance()).isEqualByComparingTo("1450.00");
    }

    @Test
    @DisplayName("PEN-01: Daily overdue job calculates late fines at flat ₹15/day for overdue borrows")
    void overdueFinesCalculation() {
        Copy copy = copyRepository.save(Copy.builder()
                .copyCode("CP-TEST-FINE-01")
                .item(testItem)
                .store(testStore)
                .condition("GOOD")
                .status("BORROWED")
                .allowedForBorrow(true)
                .build());

        com.unikart.order.Checkout checkout = checkoutRepository.save(com.unikart.order.Checkout.builder()
                .checkoutNumber("CK-TEST-002")
                .user(testCustomer)
                .idempotencyKey("IDEMP-CK-002")
                .status("CONFIRMED")
                .build());

        StoreOrder order = storeOrderRepository.save(StoreOrder.builder()
                .orderNumber("SO-TEST-FINE-01")
                .checkout(checkout)
                .user(testCustomer)
                .store(testStore)
                .fulfilmentType("SELF_PICKUP")
                .status("COMPLETED")
                .build());

        OrderLine line = orderLineRepository.save(OrderLine.builder()
                .storeOrder(order)
                .listing(testListing)
                .item(testItem)
                .lineType("BORROW")
                .allocatedCopy(copy)
                .depositAmount(new BigDecimal("400.00"))
                .lineAmount(new BigDecimal("50.00"))
                .unitItemValue(new BigDecimal("400.00"))
                .totalLineAmount(new BigDecimal("450.00"))
                .status("HANDED_OVER")
                .build());

        BorrowRecord record = borrowRecordRepository.save(BorrowRecord.builder()
                .borrowNumber("BR-TEST-FINE-01")
                .storeOrder(order)
                .orderLine(line)
                .user(testCustomer)
                .store(testStore)
                .item(testItem)
                .copy(copy)
                .duration("DAYS_14")
                .durationDays(14)
                .borrowFeePaid(new BigDecimal("50.00"))
                .depositHeld(new BigDecimal("400.00"))
                .handoverAt(Instant.now().minus(17, ChronoUnit.DAYS))
                .dueAt(Instant.now().minus(3, ChronoUnit.DAYS)) // 3 days overdue
                .status("ACTIVE")
                .build());

        int processed = lifecycleTasks.processDailyOverdueFines();
        assertThat(processed).isGreaterThanOrEqualTo(1);

        BorrowRecord updatedBorrow = borrowRecordRepository.findById(record.getBorrowId()).orElseThrow();
        assertThat(updatedBorrow.getStatus()).isEqualTo("OVERDUE");

        List<Fine> fines = fineRepository.findByBorrowRecord_BorrowId(record.getBorrowId());
        assertThat(fines).isNotEmpty();
        Fine fine = fines.get(0);
        assertThat(fine.getFineType()).isEqualTo("LATE_RETURN");
        assertThat(fine.getOverdueDays()).isEqualTo(3);
        assertThat(fine.getAssessedAmount()).isEqualByComparingTo("45.00"); // 3 * ₹15
    }
}
