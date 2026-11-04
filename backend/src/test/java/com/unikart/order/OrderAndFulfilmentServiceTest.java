package com.unikart.order;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.List;
import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.borrow.BorrowRecord;
import com.unikart.borrow.BorrowRecordRepository;
import com.unikart.cart.CartDtos.AddCartLineRequest;
import com.unikart.cart.CartService;
import com.unikart.catalog.*;
import com.unikart.catalog.CatalogDtos.*;
import com.unikart.common.BusinessException;
import com.unikart.institution.Institution;
import com.unikart.institution.InstitutionRepository;
import com.unikart.institution.Store;
import com.unikart.institution.StoreRepository;
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
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OrderAndFulfilmentServiceTest {

    @Autowired
    private OrderAndFulfilmentService orderService;

    @Autowired
    private CartService cartService;

    @Autowired
    private CatalogAndInventoryService catalogService;

    @Autowired
    private CopyRepository copyRepository;

    @Autowired
    private BorrowRecordRepository borrowRecordRepository;

    @Autowired
    private DeliveryJobRepository deliveryJobRepository;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private InstitutionRepository institutionRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    private Institution iitDelhi;
    private Institution nitTrichy;
    private Store iitStore;
    private Store nitStore;
    private User iitManager;
    private User nitManager;
    private User iitCustomer;
    private ListingResponse iitListing;
    private ListingResponse nitListing;
    private CopyResponse iitCopy;
    private CopyResponse nitCopy;

    @BeforeEach
    void setUp() {
        iitDelhi = institutionRepository.save(Institution.builder()
                .code("IITD")
                .name("IIT Delhi")
                .emailDomain("iitd.ac.in")
                .city("New Delhi")
                .state("Delhi")
                .address("Hauz Khas, New Delhi")
                .build());

        nitTrichy = institutionRepository.save(Institution.builder()
                .code("NITT")
                .name("NIT Trichy")
                .emailDomain("nitt.edu")
                .city("Tiruchirappalli")
                .state("Tamil Nadu")
                .address("Tanjore Main Road, Trichy")
                .build());

        iitStore = storeRepository.save(Store.builder()
                .institution(iitDelhi)
                .storeCode("IITD-MAIN")
                .name("Unikart IIT Delhi Store")
                .locationDetails("SAC Building, IIT Delhi")
                .build());

        nitStore = storeRepository.save(Store.builder()
                .institution(nitTrichy)
                .storeCode("NITT-MAIN")
                .name("Unikart NIT Trichy Store")
                .locationDetails("Octagon Building, NIT Trichy")
                .build());

        iitManager = userRepository.save(User.builder()
                .institution(iitDelhi)
                .assignedStore(iitStore)
                .fullName("IIT Store Manager")
                .email("mgr.iit@unikart.in")
                .phone("9111111111")
                .passwordHash("hash")
                .role("STORE_MANAGER")
                .designation("STAFF")
                .build());

        nitManager = userRepository.save(User.builder()
                .institution(nitTrichy)
                .assignedStore(nitStore)
                .fullName("NIT Store Manager")
                .email("mgr.nit@unikart.in")
                .phone("9222222222")
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

        // Seed customer wallet with ₹500 INR
        walletRepository.save(Wallet.builder()
                .user(iitCustomer)
                .currency("INR")
                .availableBalance(new BigDecimal("500.00"))
                .reservedBalance(BigDecimal.ZERO)
                .build());

        Item iitItem = catalogService.createItem(CreateItemRequest.builder()
                .title("Computer Networks")
                .author("Andrew S. Tanenbaum")
                .isbnOrCode("978-0132126953")
                .category("BOOK")
                .subject("Computer Networks")
                .courseCode("CSL374")
                .baseValue(new BigDecimal("1000.00"))
                .build(), iitManager);

        iitCopy = catalogService.createCopy(iitStore.getStoreId(), CreateCopyRequest.builder()
                .itemId(iitItem.getItemId())
                .copyCode("IITD-CN-001")
                .condition("NEW")
                .build(), iitManager);

        iitListing = catalogService.createListing(iitStore.getStoreId(), CreateListingRequest.builder()
                .itemId(iitItem.getItemId())
                .listingType("BUY_AND_BORROW")
                .salePrice(new BigDecimal("700.00"))
                .baseItemValue(new BigDecimal("1000.00"))
                .build(), iitManager);

        Item nitItem = catalogService.createItem(CreateItemRequest.builder()
                .title("Artificial Intelligence: A Modern Approach")
                .author("Stuart Russell, Peter Norvig")
                .isbnOrCode("978-0136042594")
                .category("BOOK")
                .subject("Artificial Intelligence")
                .courseCode("CSL333")
                .baseValue(new BigDecimal("1200.00"))
                .build(), nitManager);

        nitCopy = catalogService.createCopy(nitStore.getStoreId(), CreateCopyRequest.builder()
                .itemId(nitItem.getItemId())
                .copyCode("NITT-AIMA-001")
                .condition("GOOD")
                .build(), nitManager);

        nitListing = catalogService.createListing(nitStore.getStoreId(), CreateListingRequest.builder()
                .itemId(nitItem.getItemId())
                .listingType("BUY_AND_BORROW")
                .salePrice(new BigDecimal("850.00"))
                .baseItemValue(new BigDecimal("1200.00"))
                .build(), nitManager);
    }

    @Test
    @DisplayName("AT-CART-01, AT-BOR-01, AT-CAN-01: Multi-store mixed checkout, Self-Pickup OTP handover starts borrow period, and independent StoreOrder cancellation")
    void multiStoreMixedCheckoutHandoverAndPartialCancel() {
        // 1. Add Borrow line from IIT Delhi (14 days = 10% of 1000 = 100 fee + 500 deposit = 600)
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("BORROW")
                .borrowDuration("DAYS_14")
                .quantity(1)
                .build());

        // 2. Add Purchase line from NIT Trichy (salePrice = 850 + 80 cross-inst delivery = 930)
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(nitListing.getListingId())
                .lineType("PURCHASE")
                .quantity(1)
                .build());

        // 3. Submit Checkout using ₹300 from Wallet and ₹1230 from Gateway (Grand total = 1530)
        CheckoutResponse checkout = orderService.submitCheckout(iitCustomer, SubmitCheckoutRequest.builder()
                .idempotencyKey("CHK-KEY-001")
                .walletAmountToUse(new BigDecimal("300.00"))
                .storeFulfilments(List.of(
                        StoreFulfilmentChoice.builder()
                                .storeId(iitStore.getStoreId())
                                .fulfilmentType("SELF_PICKUP")
                                .build(),
                        StoreFulfilmentChoice.builder()
                                .storeId(nitStore.getStoreId())
                                .fulfilmentType("DELIVERY")
                                .deliveryAddress("Hostel 4, Room 212, IIT Delhi")
                                .build()
                ))
                .build());

        assertThat(checkout.getStoreOrders()).hasSize(2);
        assertThat(checkout.getGrandTotalAmount()).isEqualByComparingTo("1530.00");
        assertThat(checkout.getWalletPaidAmount()).isEqualByComparingTo("300.00");
        assertThat(checkout.getGatewayPaidAmount()).isEqualByComparingTo("1230.00");

        StoreOrderResponse iitOrder = checkout.getStoreOrders().get(0);
        StoreOrderResponse nitOrder = checkout.getStoreOrders().get(1);

        // BOR-04: BorrowRecord is created automatically in CONFIRMED state, but handoverAt & dueAt are NULL until handover (BOR-05)
        UUID borrowId = iitOrder.getLines().get(0).getBorrowRecordId();
        assertThat(borrowId).isNotNull();
        BorrowRecord brBeforeHandover = borrowRecordRepository.findById(borrowId).orElseThrow();
        assertThat(brBeforeHandover.getStatus()).isEqualTo("CONFIRMED");
        assertThat(brBeforeHandover.getHandoverAt()).isNull();
        assertThat(brBeforeHandover.getDueAt()).isNull();

        // 4. Mark IIT Delhi order Ready for Pickup and complete OTP handover (FUL-01, BOR-05)
        StoreOrderResponse readyOrder = orderService.markReadyForPickup(iitOrder.getStoreOrderId(), iitManager);
        assertThat(readyOrder.getStatus()).isEqualTo("READY_FOR_PICKUP");
        assertThat(readyOrder.getPickupDeadlineAt()).isNotNull();

        StoreOrderResponse handedOver = orderService.completeSelfPickupHandover(
                iitOrder.getStoreOrderId(),
                HandoverVerifyRequest.builder().otpCode(readyOrder.getPickupOtpCode()).build(),
                iitManager);
        assertThat(handedOver.getStatus()).isEqualTo("HANDED_OVER");

        // Verify BOR-05: BorrowRecord is now ACTIVE with handoverAt and dueAt (+14 days) populated
        BorrowRecord brAfterHandover = borrowRecordRepository.findById(borrowId).orElseThrow();
        assertThat(brAfterHandover.getStatus()).isEqualTo("ACTIVE");
        assertThat(brAfterHandover.getHandoverAt()).isNotNull();
        assertThat(brAfterHandover.getDueAt()).isNotNull();

        // 5. AT-CAN-01 & AT-CART-03: Cancel NIT Trichy StoreOrder before handover -> split refund to Wallet & Gateway
        RefundResponse refund = orderService.cancelStoreOrder(nitOrder.getStoreOrderId(), CancelStoreOrderRequest.builder()
                .idempotencyKey("CANCEL-NIT-001")
                .reason("Found book in library")
                .build(), iitCustomer);

        assertThat(refund.getNetRefundAmount()).isEqualByComparingTo("930.00");
        assertThat(refund.getWalletRefundShare().add(refund.getGatewayRefundShare())).isEqualByComparingTo("930.00");
        assertThat(refund.getWalletRefundShare()).isEqualTo(nitOrder.getWalletAllocatedAmount());
        assertThat(refund.getGatewayRefundShare()).isEqualTo(nitOrder.getGatewayAllocatedAmount());

        // NIT copy is released back to AVAILABLE
        assertThat(copyRepository.findById(nitCopy.getCopyId()).orElseThrow().getStatus()).isEqualTo("AVAILABLE");
    }

    @Test
    @DisplayName("AT-FUL-01 (FUL-02 / BR-14): 7-day Self-Pickup no-show cancels order, keeps non-refundable borrow fee, and deducts 10% no-show fee from deposit")
    void selfPickupNoShowDeductsFeeFromDepositAndKeepsBorrowFee() {
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(iitListing.getListingId())
                .lineType("BORROW")
                .borrowDuration("DAYS_14")
                .quantity(1)
                .build());

        // Borrow fee = 100, Deposit = 500, Total = 600 paid via Wallet + Gateway
        CheckoutResponse checkout = orderService.submitCheckout(iitCustomer, SubmitCheckoutRequest.builder()
                .idempotencyKey("CHK-NOSHOW-001")
                .walletAmountToUse(new BigDecimal("300.00"))
                .storeFulfilments(List.of(
                        StoreFulfilmentChoice.builder()
                                .storeId(iitStore.getStoreId())
                                .fulfilmentType("SELF_PICKUP")
                                .build()
                ))
                .build());

        UUID soId = checkout.getStoreOrders().get(0).getStoreOrderId();
        orderService.markReadyForPickup(soId, iitManager);

        // Process 7-day no-show expiry
        RefundResponse noShowRefund = orderService.processPickupNoShowExpiry(soId, iitManager);

        // Gross refundable = ₹500 deposit (₹100 borrow fee is kept), Deduction = 10% of ₹500 = ₹50, Net refund = ₹450
        assertThat(noShowRefund.getGrossRefundableAmount()).isEqualByComparingTo("500.00");
        assertThat(noShowRefund.getDeductedCharges()).isEqualByComparingTo("50.00");
        assertThat(noShowRefund.getNetRefundAmount()).isEqualByComparingTo("450.00");
        assertThat(noShowRefund.getWalletRefundShare()).isEqualByComparingTo("225.00");
        assertThat(noShowRefund.getGatewayRefundShare()).isEqualByComparingTo("225.00");
        assertThat(copyRepository.findById(iitCopy.getCopyId()).orElseThrow().getStatus()).isEqualTo("AVAILABLE");
    }

    @Test
    @DisplayName("AT-FUL-02 & AT-INT-02 (FUL-07 / FUL-10): Delivery job idempotency and 2 customer-unavailable retries before return-to-store settlement")
    void deliveryRetriesAndReturnToStoreSettlement() {
        cartService.addLineToCart(iitCustomer, AddCartLineRequest.builder()
                .listingId(nitListing.getListingId())
                .lineType("PURCHASE")
                .quantity(1)
                .build());

        CheckoutResponse checkout = orderService.submitCheckout(iitCustomer, SubmitCheckoutRequest.builder()
                .idempotencyKey("CHK-DLV-001")
                .storeFulfilments(List.of(
                        StoreFulfilmentChoice.builder()
                                .storeId(nitStore.getStoreId())
                                .fulfilmentType("DELIVERY")
                                .deliveryAddress("Hostel 4, IIT Delhi")
                                .build()
                ))
                .build());

        UUID soId = checkout.getStoreOrders().get(0).getStoreOrderId();

        // Dispatch with idempotency key twice -> only 1 DeliveryJob created (AT-INT-02 / FUL-10)
        orderService.dispatchDeliveryOrder(soId, "DISP-KEY-1", nitManager);
        StoreOrderResponse dispatched = orderService.dispatchDeliveryOrder(soId, "DISP-KEY-1", nitManager);
        assertThat(dispatched.getStatus()).isEqualTo("DISPATCHED");

        DeliveryJob job = deliveryJobRepository.findByStoreOrder_StoreOrderIdAndDirection(soId, "OUTBOUND").orElseThrow();

        // Failure 1 (Retry 1 scheduled)
        StoreOrderResponse fail1 = orderService.handleDeliveryWebhook(DeliveryWebhookRequest.builder()
                .eventId("EVT-1")
                .jobId(job.getJobId())
                .status("FAILED")
                .failureReason("Customer unavailable")
                .build());
        assertThat(fail1.getStatus()).isEqualTo("DELIVERY_FAILED");
        assertThat(fail1.getDeliveryAttemptCount()).isEqualTo(1);

        // Failure 2 (Retry 2 scheduled)
        StoreOrderResponse fail2 = orderService.handleDeliveryWebhook(DeliveryWebhookRequest.builder()
                .eventId("EVT-2")
                .jobId(job.getJobId())
                .status("FAILED")
                .failureReason("Customer unavailable again")
                .build());
        assertThat(fail2.getStatus()).isEqualTo("DELIVERY_FAILED");
        assertThat(fail2.getDeliveryAttemptCount()).isEqualTo(2);

        // Failure 3 (Exceeds max 2 retries -> returns to store, cancels order, deducts outbound + return delivery charges ₹80 * 2 = ₹160 from ₹850 item price)
        StoreOrderResponse fail3 = orderService.handleDeliveryWebhook(DeliveryWebhookRequest.builder()
                .eventId("EVT-3")
                .jobId(job.getJobId())
                .status("FAILED")
                .failureReason("Refused at door")
                .build());
        assertThat(fail3.getStatus()).isEqualTo("CANCELLED");
        assertThat(fail3.getDeliveryJobStatus()).isEqualTo("RETURNED_TO_STORE");
        assertThat(copyRepository.findById(nitCopy.getCopyId()).orElseThrow().getStatus()).isEqualTo("AVAILABLE");
    }
}
