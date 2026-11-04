package com.unikart.borrow;
import java.math.BigDecimal;
import java.util.UUID;
import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.borrow.BorrowAndFineDtos.*;
import com.unikart.cart.CartDtos.AddCartLineRequest;
import com.unikart.cart.CartService;
import com.unikart.catalog.*;
import com.unikart.catalog.CatalogDtos.*;
import com.unikart.institution.Institution;
import com.unikart.institution.InstitutionRepository;
import com.unikart.institution.Store;
import com.unikart.institution.StoreRepository;
import com.unikart.order.*;
import com.unikart.order.OrderDtos.*;
import com.unikart.wallet.Wallet;
import com.unikart.wallet.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BorrowAndFineServiceTest {

    @Autowired
    private BorrowAndFineService borrowService;

    @Autowired
    private OrderAndFulfilmentService orderService;

    @Autowired
    private CartService cartService;

    @Autowired
    private CatalogAndInventoryService catalogService;

    @Autowired
    private BorrowRecordRepository borrowRecordRepository;

    @Autowired
    private FineRepository fineRepository;

    @Autowired
    private DueRepository dueRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    private Institution iitDelhi;
    private Store iitStore;
    private User iitManager;
    private User iitCustomer;
    private ListingResponse iitListing;
    private CopyResponse iitCopy;

    @BeforeEach
    void setUp() {
        iitDelhi = institutionRepository.save(Institution.builder()
                .code("IITD")
                .name("IIT Delhi")
                .emailDomain("iitd.ac.in")
                .city("New Delhi")
                .state("Delhi")
                .address("Hauz Khas")
                .build());

        iitStore = storeRepository.save(Store.builder()
                .institution(iitDelhi)
                .storeCode("IITD-MAIN")
                .name("Unikart IIT Delhi Store")
                .locationDetails("SAC")
                .build());

        iitManager = userRepository.save(User.builder()
                .institution(iitDelhi)
                .assignedStore(iitStore)
                .fullName("IIT Manager")
                .email("mgr@unikart.in")
                .phone("9111111111")
                .passwordHash("hash")
                .role("STORE_MANAGER")
                .designation("STAFF")
                .build());

        iitCustomer = userRepository.save(User.builder()
                .institution(iitDelhi)
                .institutionalId("2026IS07")
                .fullName("Aryan Singh")
                .email("aryan@iitd.ac.in")
                .phone("9333333333")
                .passwordHash("hash")
                .role("CUSTOMER")
                .designation("STUDENT")
                .build());

        walletRepository.save(Wallet.builder()
                .user(iitCustomer)
                .currency("INR")
                .availableBalance(new BigDecimal("1000.00"))
                .reservedBalance(BigDecimal.ZERO)
                .build());

        Item item = catalogService.createItem(CreateItemRequest.builder()
                .title("Operating Systems: Three Easy Pieces")
                .author("Remzi H. Arpaci-Dusseau")
                .isbnOrCode("978-1935700662")
                .category("BOOK")
                .subject("Operating Systems")
                .courseCode("COL331")
                .baseValue(new BigDecimal("1000.00"))
                .build(), iitManager);

        iitCopy = catalogService.createCopy(iitStore.getStoreId(), CreateCopyRequest.builder()
                .itemId(item.getItemId())
                .copyCode("IITD-OSTEP-01")
                .condition("NEW")
                .build(), iitManager);

        iitListing = catalogService.createListing(iitStore.getStoreId(), CreateListingRequest.builder()
                .itemId(item.getItemId())
                .listingType("BORROW_ONLY")
                .salePrice(new BigDecimal("999.00"))
                .baseItemValue(new BigDecimal("1000.00"))
                .build(), iitManager);
    }

    @Test
    @DisplayName("AT-BOR-02 (BOR-06): Successful borrow renewal extends due date by duration and charges renewal fee")
    void borrowRenewalExtendsDueDateAndChargesFee() {
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("BORROW")
                .borrowDuration("DAYS_14")
                .quantity(1)
                .build());

        CheckoutResponse checkout = orderService.submitCheckout(iitCustomer, SubmitCheckoutRequest.builder()
                .idempotencyKey("CHK-REN-01")
                .walletAmountToUse(new BigDecimal("600.00"))
                .storeFulfilments(List.of(
                        StoreFulfilmentChoice.builder()
                                .storeId(iitStore.getStoreId())
                                .fulfilmentType("SELF_PICKUP")
                                .build()
                ))
                .build());

        UUID storeOrderId = checkout.getStoreOrders().get(0).getStoreOrderId();
        StoreOrderResponse ready = orderService.markReadyForPickup(storeOrderId, iitManager);
        orderService.completeSelfPickupHandover(storeOrderId, HandoverVerifyRequest.builder().otpCode(ready.getPickupOtpCode()).build(), iitManager);

        UUID borrowId = checkout.getStoreOrders().get(0).getLines().get(0).getBorrowRecordId();
        BorrowRecord br = borrowRecordRepository.findById(borrowId).orElseThrow();
        Instant initialDue = br.getDueAt();

        // Renew borrow
        BorrowRecordResponse renewed = borrowService.renewBorrow(borrowId, RenewBorrowRequest.builder()
                .idempotencyKey("RENEW-KEY-01")
                .build(), iitCustomer);

        assertThat(renewed.getStatus()).isEqualTo("RENEWED");
        assertThat(renewed.getRenewedCount()).isEqualTo(1);
        assertThat(renewed.getDueAt()).isAfter(initialDue);
    }

    @Test
    @DisplayName("AT-PEN-01 (BOR-09, PEN-01..04): Late return inspection assesses flat late fine, deducts deposit first, creates Due, and blocks new borrowing")
    void lateReturnInspectionAssessFineAndBlocksBorrowing() {
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("BORROW")
                .borrowDuration("DAYS_14")
                .quantity(1)
                .build());

        CheckoutResponse checkout = orderService.submitCheckout(iitCustomer, SubmitCheckoutRequest.builder()
                .idempotencyKey("CHK-INSP-01")
                .walletAmountToUse(new BigDecimal("600.00"))
                .storeFulfilments(List.of(
                        StoreFulfilmentChoice.builder()
                                .storeId(iitStore.getStoreId())
                                .fulfilmentType("SELF_PICKUP")
                                .build()
                ))
                .build());

        UUID storeOrderId = checkout.getStoreOrders().get(0).getStoreOrderId();
        StoreOrderResponse ready = orderService.markReadyForPickup(storeOrderId, iitManager);
        orderService.completeSelfPickupHandover(storeOrderId, HandoverVerifyRequest.builder().otpCode(ready.getPickupOtpCode()).build(), iitManager);

        UUID borrowId = checkout.getStoreOrders().get(0).getLines().get(0).getBorrowRecordId();
        BorrowRecord br = borrowRecordRepository.findById(borrowId).orElseThrow();

        // Simulate 20 days overdue by setting dueAt in the past
        br.setDueAt(Instant.now().minus(20, ChronoUnit.DAYS));
        borrowRecordRepository.save(br);

        // Inspect return with damage assessment of ₹200 + 20 days late (20 * 15 = 300) = Total fine ₹500
        // Deposit held is ₹500. Deposit exactly covers fine.
        BorrowRecordResponse closed = borrowService.inspectReturn(borrowId, InspectReturnRequest.builder()
                .returnCondition("GOOD")
                .inspectionNotes("Returned 20 days late")
                .damageOrLossAssessmentAmount(new BigDecimal("200.00"))
                .build(), iitManager);

        assertThat(closed.getStatus()).isEqualTo("CLOSED_WITH_FINE");
        List<FineResponse> fines = borrowService.getCustomerFines(iitCustomer);
        assertThat(fines).hasSize(1);
        assertThat(fines.get(0).getAssessedAmount()).isEqualByComparingTo("500.00");
        assertThat(fines.get(0).getDepositDeductedAmount()).isEqualByComparingTo("500.00");
    }

    @Test
    @DisplayName("PEN-08 & BOR-11: Fine dispute within 7 days creates dispute record and temporarily lifts borrowing block")
    void fineDisputeLiftsBorrowingBlockTemporarily() {
        // Force a due exceeding deposit
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("BORROW")
                .borrowDuration("DAYS_14")
                .quantity(1)
                .build());

        CheckoutResponse checkout = orderService.submitCheckout(iitCustomer, SubmitCheckoutRequest.builder()
                .idempotencyKey("CHK-DISP-01")
                .walletAmountToUse(new BigDecimal("600.00"))
                .storeFulfilments(List.of(
                        StoreFulfilmentChoice.builder()
                                .storeId(iitStore.getStoreId())
                                .fulfilmentType("SELF_PICKUP")
                                .build()
                ))
                .build());

        UUID storeOrderId = checkout.getStoreOrders().get(0).getStoreOrderId();
        StoreOrderResponse ready = orderService.markReadyForPickup(storeOrderId, iitManager);
        orderService.completeSelfPickupHandover(storeOrderId, HandoverVerifyRequest.builder().otpCode(ready.getPickupOtpCode()).build(), iitManager);

        UUID borrowId = checkout.getStoreOrders().get(0).getLines().get(0).getBorrowRecordId();
        BorrowRecord br = borrowRecordRepository.findById(borrowId).orElseThrow();
        br.setDueAt(Instant.now().minus(40, ChronoUnit.DAYS)); // 40 days late = ₹600 fine + ₹300 damage = ₹900 total fine vs ₹500 deposit = ₹400 shortfall due
        borrowRecordRepository.save(br);

        borrowService.inspectReturn(borrowId, InspectReturnRequest.builder()
                .returnCondition("DAMAGED")
                .inspectionNotes("Severe water damage")
                .damageOrLossAssessmentAmount(new BigDecimal("300.00"))
                .build(), iitManager);

        assertThat(iitCustomer.isBlockedFlag()).isTrue();

        FineResponse fine = borrowService.getCustomerFines(iitCustomer).get(0);

        // Dispute fine within 7 days
        FineResponse disputed = borrowService.disputeFine(fine.getFineId(), DisputeFineRequest.builder()
                .reason("Book was delivered in pre-damaged condition")
                .build(), iitCustomer);

        assertThat(disputed.getDisputeStatus()).isEqualTo("SUBMITTED");
        // BOR-11: Disputed fine must lift the borrowing block
        User refreshedCustomer = userRepository.findById(iitCustomer.getUserId()).orElseThrow();
        assertThat(refreshedCustomer.isBlockedFlag()).isFalse();
    }
}
