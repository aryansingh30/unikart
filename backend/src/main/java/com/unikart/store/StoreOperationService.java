package com.unikart.store;

import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.borrow.BorrowAndFineDtos.BorrowRecordResponse;
import com.unikart.borrow.BorrowRecord;
import com.unikart.borrow.BorrowRecordRepository;
import com.unikart.borrow.Fine;
import com.unikart.borrow.FineRepository;
import com.unikart.catalog.*;
import com.unikart.common.BusinessException;
import com.unikart.institution.Store;
import com.unikart.institution.StoreRepository;
import com.unikart.order.StoreOrder;
import com.unikart.order.StoreOrderRepository;
import com.unikart.store.StoreOperationDtos.*;
import com.unikart.wallet.Wallet;
import com.unikart.wallet.WalletRepository;
import com.unikart.wallet.WalletTransaction;
import com.unikart.wallet.WalletTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class StoreOperationService {

    private final SellSubmissionRepository sellSubmissionRepository;
    private final ItemRepository itemRepository;
    private final CopyRepository copyRepository;
    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final CatalogAndInventoryService catalogService;
    private final StoreRepository storeRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final BorrowRecordRepository borrowRecordRepository;
    private final FineRepository fineRepository;

    public StoreOperationService(
            SellSubmissionRepository sellSubmissionRepository,
            ItemRepository itemRepository,
            CopyRepository copyRepository,
            ListingRepository listingRepository,
            UserRepository userRepository,
            WalletRepository walletRepository,
            WalletTransactionRepository walletTransactionRepository,
            CatalogAndInventoryService catalogService,
            StoreRepository storeRepository,
            StoreOrderRepository storeOrderRepository,
            BorrowRecordRepository borrowRecordRepository,
            FineRepository fineRepository) {
        this.sellSubmissionRepository = sellSubmissionRepository;
        this.itemRepository = itemRepository;
        this.copyRepository = copyRepository;
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.catalogService = catalogService;
        this.storeRepository = storeRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.borrowRecordRepository = borrowRecordRepository;
        this.fineRepository = fineRepository;
    }

    /**
     * SELL-01..03: Store Manager records in-store sell submission, verifies user & condition, and records valuation quote.
     */
    @Transactional
    public SellSubmissionResponse createSellSubmission(UUID storeId, CreateSellSubmissionRequest req, User manager) {
        Store store = resolveAndAuthorizeStoreAccess(storeId, manager);
        User seller = userRepository.findByEmailIgnoreCase(req.getSellerEmail().trim())
                .orElseThrow(() -> new BusinessException("Seller not found with email: " + req.getSellerEmail(), HttpStatus.NOT_FOUND));

        if (!"CUSTOMER".equalsIgnoreCase(seller.getRole())) {
            throw new BusinessException("Sell-to-store is only permitted for authorised Customers");
        }

        Instant now = Instant.now();
        SellSubmission submission = SellSubmission.builder()
                .submissionNumber("SELL-" + System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(100, 999))
                .seller(seller)
                .store(store)
                .verifiedByManager(manager)
                .status("QUOTED")
                .visitNotes(req.getVisitNotes())
                .build();

        BigDecimal totalQuote = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        List<SellLine> sellLines = new ArrayList<>();

        for (SellLineQuoteInput input : req.getLines()) {
            Item item = itemRepository.findById(input.getItemId())
                    .orElseThrow(() -> new BusinessException("Item not found: " + input.getItemId(), HttpStatus.NOT_FOUND));

            BigDecimal quoted = input.getQuotedAmount().setScale(2, RoundingMode.HALF_UP);
            totalQuote = totalQuote.add(quoted);

            SellLine line = SellLine.builder()
                    .submission(submission)
                    .item(item)
                    .authenticityVerified(true)
                    .assessedCondition(input.getAssessedCondition().toUpperCase(Locale.ROOT))
                    .baseItemValue(item.getBaseValue())
                    .quotedAmount(quoted)
                    .decision("QUOTED")
                    .intendedListingType(input.getIntendedListingType() != null ? input.getIntendedListingType().toUpperCase(Locale.ROOT) : "BUY_AND_BORROW")
                    .build();
            sellLines.add(line);
        }

        submission.setTotalQuotedAmount(totalQuote);
        submission.getLines().addAll(sellLines);
        SellSubmission saved = sellSubmissionRepository.save(submission);

        return toResponse(saved);
    }

    /**
     * SELL-04..07: Store Manager records in-person decision (APPROVE or REJECT).
     * On approval:
     * - Credits wallet with agreed payout (SELL-05).
     * - Creates new Copy in store inventory and publishes Listing (SELL-07).
     */
    @Transactional
    public SellSubmissionResponse decideSellSubmission(UUID submissionId, ManagerDecideSellRequest req, User manager) {
        SellSubmission sub = sellSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new BusinessException("Sell submission not found", HttpStatus.NOT_FOUND));

        resolveAndAuthorizeStoreAccess(sub.getStore().getStoreId(), manager);

        if (!"QUOTED".equals(sub.getStatus())) {
            throw new BusinessException("Submission is not in QUOTED state (current: " + sub.getStatus() + ")");
        }

        Instant now = Instant.now();
        String action = req.getDecisionAction().trim().toUpperCase(Locale.ROOT);

        if ("REJECT".equals(action)) {
            sub.setStatus("REJECTED");
            sub.setDecidedAt(now);
            sub.setUpdatedAt(now);
            for (SellLine line : sub.getLines()) {
                line.setDecision("REJECTED_BY_STORE");
                line.setRejectionOrDeclineReason(req.getNotes());
            }
            return toResponse(sellSubmissionRepository.save(sub));
        }

        if (!"APPROVE".equals(action)) {
            throw new BusinessException("Invalid decision action: must be APPROVE or REJECT");
        }

        BigDecimal totalPayout = sub.getTotalQuotedAmount();
        sub.setStatus("SELLER_ACCEPTED_APPROVED");
        sub.setTotalApprovedPayout(totalPayout);
        sub.setDecidedAt(now);
        sub.setUpdatedAt(now);

        // SELL-05: Credit seller wallet
        Wallet wallet = getOrCreateWallet(sub.getSeller());
        BigDecimal newBal = wallet.getAvailableBalance().add(totalPayout).setScale(2, RoundingMode.HALF_UP);
        wallet.setAvailableBalance(newBal);
        wallet.setUpdatedAt(now);
        walletRepository.save(wallet);

        WalletTransaction wTx = WalletTransaction.builder()
                .wallet(wallet)
                .user(sub.getSeller())
                .idempotencyKey("SELL-PAYOUT-" + sub.getSubmissionId())
                .txType("SELLER_PAYOUT_CREDIT")
                .direction("CREDIT")
                .amount(totalPayout)
                .state("SUCCESS")
                .balanceAfter(newBal)
                .reservedAfter(wallet.getReservedBalance())
                .referenceType("SELL_SUBMISSION")
                .referenceId(sub.getSubmissionId().toString())
                .description("Store sell payout credit for submission " + sub.getSubmissionNumber())
                .build();
        walletTransactionRepository.save(wTx);
        sub.setWalletTransaction(wTx);

        // SELL-07: Create Copies and Listings for approved items
        for (SellLine line : sub.getLines()) {
            line.setDecision("ACCEPTED_AND_APPROVED");
            line.setApprovedBy(manager);
            line.setApprovedAt(now);

            // Create physical Copy
            Copy copy = Copy.builder()
                    .copyCode(sub.getStore().getStoreCode() + "-SELL-" + System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(10, 99))
                    .item(line.getItem())
                    .store(sub.getStore())
                    .condition(line.getAssessedCondition())
                    .status("AVAILABLE")
                    .acquisitionSource("CUSTOMER_SELL")
                    .sourceSellLineId(line.getSellLineId())
                    .conditionNotes("Acquired via sell-to-store submission " + sub.getSubmissionNumber())
                    .build();
            copy = copyRepository.save(copy);
            line.setCreatedCopy(copy);

            // Create or update Listing
            Optional<Listing> existingListingOpt = listingRepository.findByItem_ItemIdAndStore_StoreIdAndStatus(
                    line.getItem().getItemId(), sub.getStore().getStoreId(), "ACTIVE");

            Listing listing;
            if (existingListingOpt.isPresent()) {
                listing = existingListingOpt.get();
            } else {
                listing = listingRepository.save(Listing.builder()
                        .item(line.getItem())
                        .store(sub.getStore())
                        .listingType(line.getIntendedListingType())
                        .salePrice(line.getItem().getBaseValue().multiply(new BigDecimal("0.75")).setScale(2, RoundingMode.HALF_UP))
                        .baseItemValue(line.getItem().getBaseValue())
                        .status("ACTIVE")
                        .createdBy(manager)
                        .build());
            }
            line.setCreatedListing(listing);
            catalogService.notifyWaitlistIfBorrowableCopyAvailable(line.getItem().getItemId(), sub.getStore().getStoreId());
        }

        return toResponse(sellSubmissionRepository.save(sub));
    }

    @Transactional(readOnly = true)
    public List<SellSubmissionResponse> getStoreSellSubmissions(UUID storeId, User actor) {
        resolveAndAuthorizeStoreAccess(storeId, actor);
        return sellSubmissionRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SellSubmissionResponse> getCustomerSellSubmissions(User customer) {
        return sellSubmissionRepository.findBySeller_UserIdOrderByCreatedAtDesc(customer.getUserId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private Store resolveAndAuthorizeStoreAccess(UUID requestedStoreId, User actor) {
        if (actor == null || (!"STORE_MANAGER".equalsIgnoreCase(actor.getRole()) && !"PLATFORM_ADMIN".equalsIgnoreCase(actor.getRole()))) {
            throw new BusinessException("Only Store Managers or Platform Admins can perform store operations", HttpStatus.FORBIDDEN);
        }
        if ("STORE_MANAGER".equalsIgnoreCase(actor.getRole())) {
            if (actor.getAssignedStore() == null || !actor.getAssignedStore().getStoreId().equals(requestedStoreId)) {
                throw new BusinessException("AUTH-04: Store Manager cannot manage another store", HttpStatus.FORBIDDEN);
            }
            return actor.getAssignedStore();
        }
        return storeRepository.findById(requestedStoreId)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));
    }

    private Wallet getOrCreateWallet(User user) {
        return walletRepository.findByUser_UserId(user.getUserId())
                .orElseGet(() -> walletRepository.save(Wallet.builder()
                        .user(user)
                        .currency("INR")
                        .availableBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .reservedBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .build()));
    }

    private SellSubmissionResponse toResponse(SellSubmission s) {
        List<SellLineResponse> lineResps = s.getLines().stream().map(l -> SellLineResponse.builder()
                .sellLineId(l.getSellLineId())
                .itemId(l.getItem().getItemId())
                .itemTitle(l.getItem().getTitle())
                .isbnOrCode(l.getItem().getIsbnOrCode())
                .authenticityVerified(l.isAuthenticityVerified())
                .assessedCondition(l.getAssessedCondition())
                .baseItemValue(l.getBaseItemValue())
                .quotedAmount(l.getQuotedAmount())
                .decision(l.getDecision())
                .intendedListingType(l.getIntendedListingType())
                .rejectionOrDeclineReason(l.getRejectionOrDeclineReason())
                .createdCopyId(l.getCreatedCopy() != null ? l.getCreatedCopy().getCopyId() : null)
                .createdListingId(l.getCreatedListing() != null ? l.getCreatedListing().getListingId() : null)
                .build()).collect(Collectors.toList());

        return SellSubmissionResponse.builder()
                .submissionId(s.getSubmissionId())
                .submissionNumber(s.getSubmissionNumber())
                .sellerUserId(s.getSeller().getUserId())
                .sellerName(s.getSeller().getFullName())
                .sellerEmail(s.getSeller().getEmail())
                .storeId(s.getStore().getStoreId())
                .storeName(s.getStore().getName())
                .status(s.getStatus())
                .totalQuotedAmount(s.getTotalQuotedAmount())
                .totalApprovedPayout(s.getTotalApprovedPayout())
                .visitNotes(s.getVisitNotes())
                .decidedAt(s.getDecidedAt())
                .lines(lineResps)
                .createdAt(s.getCreatedAt())
                .build();
    }

    private Store resolveManagerStore(User manager) {
        Store store = manager != null ? manager.getAssignedStore() : null;
        if (store == null) {
            List<Store> allStores = storeRepository.findAll();
            store = allStores.isEmpty() ? null : allStores.get(0);
        }
        return store;
    }

    @Transactional(readOnly = true)
    public ManagerOverviewResponse getManagerOverview(User manager) {
        Store store = resolveManagerStore(manager);
        if (store == null) {
            return ManagerOverviewResponse.builder()
                    .storeName("Unikart Campus Store")
                    .todaysSales(BigDecimal.ZERO)
                    .openOrdersCount(0)
                    .readyForPickupCount(0)
                    .activeBorrowingsCount(0)
                    .overdueBorrowingsCount(0)
                    .toInspectCount(0)
                    .fulfillmentRate(100)
                    .pickupOnTimeRate(100)
                    .inspectionSlaRate(100)
                    .rows(Collections.emptyList())
                    .build();
        }

        List<StoreOrder> orders = storeOrderRepository.findByStore_StoreIdOrderByCreatedAtDesc(store.getStoreId());
        List<BorrowRecord> borrows = borrowRecordRepository.findByStore_StoreIdOrderByCreatedAtDesc(store.getStoreId());
        List<SellSubmission> sellSubmissions = sellSubmissionRepository.findByStore_StoreIdOrderByCreatedAtDesc(store.getStoreId());

        BigDecimal totalSales = BigDecimal.ZERO;
        long openOrders = 0;
        long readyForPickup = 0;
        long completedOrders = 0;

        for (StoreOrder o : orders) {
            if (!"CANCELLED".equalsIgnoreCase(o.getStatus())) {
                totalSales = totalSales.add(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO);
            }
            if ("CONFIRMED".equalsIgnoreCase(o.getStatus()) || "PREPARING".equalsIgnoreCase(o.getStatus()) || "PROCESSING".equalsIgnoreCase(o.getStatus())) {
                openOrders++;
            } else if ("READY_FOR_PICKUP".equalsIgnoreCase(o.getStatus())) {
                openOrders++;
                readyForPickup++;
            } else if ("HANDED_OVER".equalsIgnoreCase(o.getStatus()) || "COMPLETED".equalsIgnoreCase(o.getStatus())) {
                completedOrders++;
            }
        }

        long activeBorrows = 0;
        long overdueBorrows = 0;
        long pendingHandoverBorrows = 0;
        long returnsToInspect = 0;

        for (BorrowRecord b : borrows) {
            String st = b.getStatus();
            if ("ACTIVE".equalsIgnoreCase(st) || "DUE_SOON".equalsIgnoreCase(st) || "RENEWED".equalsIgnoreCase(st)) {
                activeBorrows++;
            } else if ("OVERDUE".equalsIgnoreCase(st)) {
                activeBorrows++;
                overdueBorrows++;
            } else if ("CONFIRMED".equalsIgnoreCase(st) || "DISPATCHED".equalsIgnoreCase(st) || "READY_FOR_PICKUP".equalsIgnoreCase(st) || "AWAITING_HANDOVER".equalsIgnoreCase(st)) {
                pendingHandoverBorrows++;
            } else if ("RETURN_REQUESTED".equalsIgnoreCase(st)) {
                returnsToInspect++;
            }
        }

        long pendingSells = sellSubmissions.stream().filter(s -> "SUBMITTED".equalsIgnoreCase(s.getStatus()) || "QUOTED".equalsIgnoreCase(s.getStatus())).count();
        long toInspect = returnsToInspect + pendingSells;

        int totalOrdersCount = orders.size();
        int fulfillmentRate = totalOrdersCount > 0 ? (int) Math.round((double) completedOrders / totalOrdersCount * 100) : 100;

        List<ManagerOverviewItem> rows = new ArrayList<>();

        // Add real pending borrowings awaiting handover to overview rows FIRST (requires staff approval)
        for (BorrowRecord b : borrows) {
            String st = b.getStatus();
            if ("CONFIRMED".equalsIgnoreCase(st) || "DISPATCHED".equalsIgnoreCase(st) || "READY_FOR_PICKUP".equalsIgnoreCase(st) || "AWAITING_HANDOVER".equalsIgnoreCase(st)) {
                String borrowerName = b.getUser() != null ? b.getUser().getFullName() : "Student";
                String bookTitle = b.getItem() != null ? b.getItem().getTitle() : "Borrowed Book";
                String otp = (b.getStoreOrder() != null && b.getStoreOrder().getPickupOtpCode() != null) ? b.getStoreOrder().getPickupOtpCode() : null;

                rows.add(ManagerOverviewItem.builder()
                        .id(b.getBorrowNumber() != null ? b.getBorrowNumber() : b.getBorrowId().toString().substring(0, 8))
                        .referenceId(b.getBorrowId().toString())
                        .title(borrowerName)
                        .meta(bookTitle + " · " + b.getDurationDays() + "d loan · Awaiting handover" + (otp != null ? " · OTP: " + otp : ""))
                        .value("₹" + (b.getDepositHeld() != null ? b.getDepositHeld().stripTrailingZeros().toPlainString() : "0"))
                        .status("Awaiting handover")
                        .tone("warning")
                        .secondary("Borrow approval")
                        .type("borrow")
                        .pickupOtp(otp)
                        .build());
            }
        }

        // Add real orders to overview rows
        for (StoreOrder o : orders) {
            String customerName = o.getUser() != null ? o.getUser().getFullName() : "Customer";
            int itemsCount = (o.getLines() != null && !o.getLines().isEmpty()) ? o.getLines().size() : 1;
            String fType = "DELIVERY".equalsIgnoreCase(o.getFulfilmentType()) ? "Delivery" : "Self-pickup";
            String status = o.getStatus();
            String tone = "neutral";
            if ("READY_FOR_PICKUP".equalsIgnoreCase(status)) {
                status = "Ready for pickup";
                tone = "success";
            } else if ("PREPARING".equalsIgnoreCase(status) || "PROCESSING".equalsIgnoreCase(status) || "CONFIRMED".equalsIgnoreCase(status)) {
                status = "Ready to pack";
                tone = "info";
            } else if ("CANCELLED".equalsIgnoreCase(status)) {
                status = "Cancelled";
                tone = "neutral";
            } else if ("HANDED_OVER".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status)) {
                status = "Completed";
                tone = "success";
            }

            rows.add(ManagerOverviewItem.builder()
                    .id(o.getOrderNumber() != null ? o.getOrderNumber() : o.getStoreOrderId().toString().substring(0, 8))
                    .referenceId(o.getStoreOrderId().toString())
                    .title(customerName)
                    .meta(itemsCount + (itemsCount == 1 ? " item" : " items") + " · " + fType + (o.getPickupOtpCode() != null ? " · OTP: " + o.getPickupOtpCode() : ""))
                    .value("₹" + (o.getTotalAmount() != null ? o.getTotalAmount().stripTrailingZeros().toPlainString() : "0"))
                    .status(status)
                    .tone(tone)
                    .secondary("Order")
                    .type("order")
                    .pickupOtp(o.getPickupOtpCode())
                    .build());
        }

        // Add real returns awaiting inspection to overview rows
        for (BorrowRecord b : borrows) {
            if ("RETURN_REQUESTED".equalsIgnoreCase(b.getStatus()) || "OVERDUE".equalsIgnoreCase(b.getStatus())) {
                String borrowerName = b.getUser() != null ? b.getUser().getFullName() : "Borrower";
                String bookTitle = b.getItem() != null ? b.getItem().getTitle() : "Borrowed Book";
                boolean isOverdue = "OVERDUE".equalsIgnoreCase(b.getStatus());

                rows.add(ManagerOverviewItem.builder()
                        .id(b.getBorrowNumber() != null ? b.getBorrowNumber() : b.getBorrowId().toString().substring(0, 8))
                        .referenceId(b.getBorrowId().toString())
                        .title(borrowerName)
                        .meta(bookTitle + " · " + (isOverdue ? "Overdue return" : "Returned at desk"))
                        .value("₹" + (b.getDepositHeld() != null ? b.getDepositHeld().stripTrailingZeros().toPlainString() : "0"))
                        .status(isOverdue ? "Overdue" : "Awaiting inspection")
                        .tone(isOverdue ? "danger" : "warning")
                        .secondary("Return")
                        .type("return")
                        .build());
            }
        }

        return ManagerOverviewResponse.builder()
                .storeId(store.getStoreId())
                .storeName(store.getName())
                .storeCode(store.getStoreCode())
                .institutionName(store.getInstitution() != null ? store.getInstitution().getName() : "Campus Store")
                .todaysSales(totalSales.setScale(2, RoundingMode.HALF_UP))
                .openOrdersCount(openOrders)
                .readyForPickupCount(readyForPickup + pendingHandoverBorrows)
                .activeBorrowingsCount(activeBorrows + pendingHandoverBorrows)
                .overdueBorrowingsCount(overdueBorrows)
                .toInspectCount(toInspect)
                .fulfillmentRate(fulfillmentRate)
                .pickupOnTimeRate(95)
                .inspectionSlaRate(98)
                .rows(rows)
                .build();
    }

    @Transactional(readOnly = true)
    public ManagerPageResponse getManagerPageData(String page, User manager) {
        Store store = resolveManagerStore(manager);
        if (store == null) {
            return ManagerPageResponse.builder()
                    .page(page)
                    .title("Store Console")
                    .description("Store operations")
                    .stats(Collections.emptyList())
                    .rows(Collections.emptyList())
                    .build();
        }
        UUID storeId = store.getStoreId();
        List<ManagerPageStat> stats = new ArrayList<>();
        List<ManagerOverviewItem> rows = new ArrayList<>();

        switch (page.toLowerCase()) {
            case "orders": {
                List<StoreOrder> orders = storeOrderRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long openCount = 0;
                long readyCount = 0;
                BigDecimal revenue = BigDecimal.ZERO;
                long awaitingPay = 0;
                for (StoreOrder o : orders) {
                    if (!"CANCELLED".equalsIgnoreCase(o.getStatus())) {
                        revenue = revenue.add(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO);
                    }
                    if ("READY_FOR_PICKUP".equalsIgnoreCase(o.getStatus())) {
                        readyCount++;
                        openCount++;
                    } else if ("CONFIRMED".equalsIgnoreCase(o.getStatus()) || "PREPARING".equalsIgnoreCase(o.getStatus()) || "PROCESSING".equalsIgnoreCase(o.getStatus())) {
                        openCount++;
                    } else if ("PAYMENT_PENDING".equalsIgnoreCase(o.getStatus())) {
                        awaitingPay++;
                    }
                    int items = (o.getLines() != null && !o.getLines().isEmpty()) ? o.getLines().size() : 1;
                    String custName = o.getUser() != null ? o.getUser().getFullName() : "Customer";
                    String fType = "DELIVERY".equalsIgnoreCase(o.getFulfilmentType()) ? "Delivery" : "Self-pickup";
                    String tone = "CANCELLED".equalsIgnoreCase(o.getStatus()) ? "neutral" : "READY_FOR_PICKUP".equalsIgnoreCase(o.getStatus()) ? "success" : "info";
                    rows.add(ManagerOverviewItem.builder()
                            .id(o.getOrderNumber() != null ? o.getOrderNumber() : o.getStoreOrderId().toString().substring(0, 8))
                            .referenceId(o.getStoreOrderId().toString())
                            .title(custName)
                            .meta(items + (items == 1 ? " item" : " items") + " · " + fType + (o.getPickupOtpCode() != null ? " · OTP: " + o.getPickupOtpCode() : ""))
                            .value("₹" + (o.getTotalAmount() != null ? o.getTotalAmount().stripTrailingZeros().toPlainString() : "0"))
                            .status(o.getStatus().replace('_', ' '))
                            .tone(tone)
                            .secondary("Store Order")
                            .type("order")
                            .pickupOtp(o.getPickupOtpCode())
                            .build());
                }
                stats.add(ManagerPageStat.builder().label("Open orders").value(String.valueOf(openCount)).change(readyCount + " ready for pickup").tone("info").build());
                stats.add(ManagerPageStat.builder().label("Today’s revenue").value("₹" + revenue.setScale(2, RoundingMode.HALF_UP).toPlainString()).change("Store GMV").build());
                stats.add(ManagerPageStat.builder().label("Awaiting payment").value(String.valueOf(awaitingPay)).change(awaitingPay > 0 ? "Follow up" : "All cleared").tone(awaitingPay > 0 ? "warning" : "neutral").build());
                stats.add(ManagerPageStat.builder().label("Total orders").value(String.valueOf(orders.size())).change("All time").build());
                return ManagerPageResponse.builder().page("orders").title("Orders").description("Review purchases, reserve stock, and coordinate fulfillment.").stats(stats).rows(rows).build();
            }
            case "pickup": {
                List<StoreOrder> orders = storeOrderRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                List<BorrowRecord> borrows = borrowRecordRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long readyCount = 0;
                long awaitingPrep = 0;
                for (StoreOrder o : orders) {
                    boolean isPickup = "SELF_PICKUP".equalsIgnoreCase(o.getFulfilmentType()) || o.getPickupOtpCode() != null;
                    if (!isPickup) continue;
                    if ("READY_FOR_PICKUP".equalsIgnoreCase(o.getStatus())) {
                        readyCount++;
                    } else if ("CONFIRMED".equalsIgnoreCase(o.getStatus()) || "PREPARING".equalsIgnoreCase(o.getStatus())) {
                        awaitingPrep++;
                    }
                    int items = (o.getLines() != null && !o.getLines().isEmpty()) ? o.getLines().size() : 1;
                    String custName = o.getUser() != null ? o.getUser().getFullName() : "Customer";
                    rows.add(ManagerOverviewItem.builder()
                            .id(o.getOrderNumber() != null ? o.getOrderNumber() : o.getStoreOrderId().toString().substring(0, 8))
                            .referenceId(o.getStoreOrderId().toString())
                            .title(custName)
                            .meta(items + " items · Pickup OTP: " + (o.getPickupOtpCode() != null ? o.getPickupOtpCode() : "N/A"))
                            .value("₹" + (o.getTotalAmount() != null ? o.getTotalAmount().stripTrailingZeros().toPlainString() : "0"))
                            .status(o.getStatus().replace('_', ' '))
                            .tone("READY_FOR_PICKUP".equalsIgnoreCase(o.getStatus()) ? "success" : "info")
                            .secondary("Pickup desk")
                            .type("pickup")
                            .pickupOtp(o.getPickupOtpCode())
                            .build());
                }

                // Add pending borrowings awaiting desk handover
                for (BorrowRecord b : borrows) {
                    String st = b.getStatus();
                    if ("CONFIRMED".equalsIgnoreCase(st) || "DISPATCHED".equalsIgnoreCase(st) || "READY_FOR_PICKUP".equalsIgnoreCase(st) || "AWAITING_HANDOVER".equalsIgnoreCase(st)) {
                        readyCount++;
                        String borrower = b.getUser() != null ? b.getUser().getFullName() : "Student";
                        String title = b.getItem() != null ? b.getItem().getTitle() : "Book";
                        String otp = (b.getStoreOrder() != null && b.getStoreOrder().getPickupOtpCode() != null) ? b.getStoreOrder().getPickupOtpCode() : "N/A";
                        rows.add(ManagerOverviewItem.builder()
                                .id(b.getBorrowNumber() != null ? b.getBorrowNumber() : b.getBorrowId().toString().substring(0, 8))
                                .referenceId(b.getBorrowId().toString())
                                .title(borrower)
                                .meta(title + " · Borrow (" + b.getDurationDays() + "d) · Counter handover · OTP: " + otp)
                                .value("₹" + (b.getDepositHeld() != null ? b.getDepositHeld().stripTrailingZeros().toPlainString() : "0"))
                                .status("Awaiting handover")
                                .tone("warning")
                                .secondary("Pickup desk")
                                .type("borrow")
                                .pickupOtp(otp)
                                .build());
                    }
                }

                stats.add(ManagerPageStat.builder().label("Ready for pickup").value(String.valueOf(readyCount)).change("At counter").tone("success").build());
                stats.add(ManagerPageStat.builder().label("Awaiting prep").value(String.valueOf(awaitingPrep)).change("In sorting").tone("info").build());
                stats.add(ManagerPageStat.builder().label("OTP verification rate").value("100%").change("Direct store handover").build());
                stats.add(ManagerPageStat.builder().label("Pickup window").value("7 days").change("Policy standard").build());
                return ManagerPageResponse.builder().page("pickup").title("Pickup Desk").description("Verify student OTPs, issue reserved copies, and log counter handovers.").stats(stats).rows(rows).build();
            }
            case "borrowings": {
                List<BorrowRecord> borrows = borrowRecordRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long active = 0;
                long overdue = 0;
                long awaitingHandover = 0;
                long renewed = 0;
                for (BorrowRecord b : borrows) {
                    String st = b.getStatus();
                    boolean isPending = "CONFIRMED".equalsIgnoreCase(st) || "DISPATCHED".equalsIgnoreCase(st) || "READY_FOR_PICKUP".equalsIgnoreCase(st) || "AWAITING_HANDOVER".equalsIgnoreCase(st);
                    if ("ACTIVE".equalsIgnoreCase(st) || "DUE_SOON".equalsIgnoreCase(st)) {
                        active++;
                    } else if ("OVERDUE".equalsIgnoreCase(st)) {
                        active++;
                        overdue++;
                    } else if ("RENEWED".equalsIgnoreCase(st)) {
                        active++;
                        renewed++;
                    } else if (isPending) {
                        awaitingHandover++;
                    }

                    String borrower = b.getUser() != null ? b.getUser().getFullName() : "Student";
                    String title = b.getItem() != null ? b.getItem().getTitle() : "Book";
                    String displayStatus = isPending ? "Awaiting Handover" : st.replace('_', ' ');
                    String tone = "OVERDUE".equalsIgnoreCase(st) ? "danger" : isPending ? "warning" : "DUE_SOON".equalsIgnoreCase(st) ? "warning" : "success";
                    String otp = (b.getStoreOrder() != null && b.getStoreOrder().getPickupOtpCode() != null) ? b.getStoreOrder().getPickupOtpCode() : null;

                    rows.add(ManagerOverviewItem.builder()
                            .id(b.getBorrowNumber() != null ? b.getBorrowNumber() : b.getBorrowId().toString().substring(0, 8))
                            .referenceId(b.getBorrowId().toString())
                            .title(borrower)
                            .meta(title + (b.getDueAt() != null ? (" · Due " + b.getDueAt().toString().substring(0, 10)) : (" · " + b.getDurationDays() + "d loan · Pending approval")) + (otp != null ? " · OTP: " + otp : ""))
                            .value("₹" + (b.getDepositHeld() != null ? b.getDepositHeld().stripTrailingZeros().toPlainString() : "0"))
                            .status(displayStatus)
                            .tone(tone)
                            .secondary("Borrow loan")
                            .type("borrow")
                            .pickupOtp(otp)
                            .build());
                }
                stats.add(ManagerPageStat.builder().label("Awaiting handover").value(String.valueOf(awaitingHandover)).change(awaitingHandover > 0 ? "Approval required" : "All cleared").tone(awaitingHandover > 0 ? "warning" : "neutral").build());
                stats.add(ManagerPageStat.builder().label("Active loans").value(String.valueOf(active)).change(overdue + " overdue").tone(overdue > 0 ? "danger" : "info").build());
                stats.add(ManagerPageStat.builder().label("Overdue items").value(String.valueOf(overdue)).change("Accruing fines").tone(overdue > 0 ? "danger" : "neutral").build());
                stats.add(ManagerPageStat.builder().label("Total borrows").value(String.valueOf(borrows.size())).change("Lifetime").build());
                return ManagerPageResponse.builder().page("borrowings").title("Borrowings").description("Track active book loans, approve student handovers, manage renewals, and process checkouts.").stats(stats).rows(rows).build();
            }
            case "returns": {
                List<BorrowRecord> borrows = borrowRecordRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long toInspect = 0;
                long cleanToday = 0;
                for (BorrowRecord b : borrows) {
                    if ("RETURN_REQUESTED".equalsIgnoreCase(b.getStatus()) || "INSPECTION".equalsIgnoreCase(b.getStatus())) {
                        toInspect++;
                        String borrower = b.getUser() != null ? b.getUser().getFullName() : "Student";
                        String title = b.getItem() != null ? b.getItem().getTitle() : "Book";
                        rows.add(ManagerOverviewItem.builder()
                                .id(b.getBorrowNumber() != null ? b.getBorrowNumber() : b.getBorrowId().toString().substring(0, 8))
                                .referenceId(b.getBorrowId().toString())
                                .title(borrower)
                                .meta(title + " · Awaiting condition inspection")
                                .value("₹" + (b.getDepositHeld() != null ? b.getDepositHeld().stripTrailingZeros().toPlainString() : "0"))
                                .status("Awaiting inspection")
                                .tone("warning")
                                .secondary("Return")
                                .type("return")
                                .build());
                    } else if ("CLOSED".equalsIgnoreCase(b.getStatus()) || "RETURNED".equalsIgnoreCase(b.getStatus())) {
                        cleanToday++;
                    }
                }
                stats.add(ManagerPageStat.builder().label("To inspect").value(String.valueOf(toInspect)).change(toInspect > 0 ? "Pending desk action" : "All clear").tone(toInspect > 0 ? "warning" : "neutral").build());
                stats.add(ManagerPageStat.builder().label("Processed returns").value(String.valueOf(cleanToday)).change("Deposits settled").build());
                stats.add(ManagerPageStat.builder().label("Damage rate").value("2.1%").change("Within threshold").build());
                stats.add(ManagerPageStat.builder().label("Inspection SLA").value("100%").change("Same-day settlement").build());
                return ManagerPageResponse.builder().page("returns").title("Returns & Inspection").description("Inspect returned books, evaluate condition, assess damage fines, and release deposits.").stats(stats).rows(rows).build();
            }
            case "inventory": {
                List<Copy> copies = copyRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long available = 0;
                long allocatedOrBorrowed = 0;
                long damaged = 0;
                for (Copy c : copies) {
                    if ("AVAILABLE".equalsIgnoreCase(c.getStatus())) available++;
                    else if ("ALLOCATED".equalsIgnoreCase(c.getStatus()) || "BORROWED".equalsIgnoreCase(c.getStatus())) allocatedOrBorrowed++;
                    else if ("DAMAGED".equalsIgnoreCase(c.getStatus()) || "LOST".equalsIgnoreCase(c.getStatus())) damaged++;
                    String title = c.getItem() != null ? c.getItem().getTitle() : "Physical Copy";
                    String author = c.getItem() != null ? c.getItem().getAuthor() : "Unikart";
                    String tone = "AVAILABLE".equalsIgnoreCase(c.getStatus()) ? "success" : "DAMAGED".equalsIgnoreCase(c.getStatus()) ? "danger" : "info";
                    String shelfInfo = "AVAILABLE".equalsIgnoreCase(c.getStatus()) ? "On shelf (Available)" : c.getStatus().replace('_', ' ');
                    rows.add(ManagerOverviewItem.builder()
                            .id(c.getCopyCode() != null ? c.getCopyCode() : c.getCopyId().toString().substring(0, 8))
                            .referenceId(c.getCopyId().toString())
                            .title(title)
                            .meta(author + " · " + c.getCondition() + " · " + (c.isAllowedForSale() ? "Buy" : "") + (c.isAllowedForBorrow() ? "/Borrow" : "") + " · " + shelfInfo)
                            .value(c.getCondition() + " · " + ("AVAILABLE".equalsIgnoreCase(c.getStatus()) ? "1 in stock" : "Allocated"))
                            .status(c.getStatus().replace('_', ' '))
                            .tone(tone)
                            .secondary("Shelf copy")
                            .type("inventory")
                            .build());
                }
                stats.add(ManagerPageStat.builder().label("Total copies").value(String.valueOf(copies.size())).change("Physical stock").build());
                stats.add(ManagerPageStat.builder().label("Available on shelf").value(String.valueOf(available)).change("Ready for order").tone("success").build());
                stats.add(ManagerPageStat.builder().label("Allocated / Borrowed").value(String.valueOf(allocatedOrBorrowed)).change("With students").tone("info").build());
                stats.add(ManagerPageStat.builder().label("Damaged / Lost").value(String.valueOf(damaged)).change("Needs replacement").tone(damaged > 0 ? "danger" : "neutral").build());
                return ManagerPageResponse.builder().page("inventory").title("Inventory & Copies").description("Track every physical book copy, its barcode, condition history, and location.").stats(stats).rows(rows).build();
            }
            case "listings": {
                List<Listing> listings = listingRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long active = 0;
                long inStockCount = 0;
                long outOfStockCount = 0;
                for (Listing l : listings) {
                    if ("ACTIVE".equalsIgnoreCase(l.getStatus())) active++;
                    List<Copy> copies = copyRepository.findByItem_ItemIdAndStore_StoreId(l.getItem().getItemId(), storeId);
                    long totalCopies = copies.size();
                    long availCopies = copies.stream().filter(c -> "AVAILABLE".equalsIgnoreCase(c.getStatus())).count();
                    if (availCopies > 0) inStockCount++;
                    else outOfStockCount++;

                    String title = l.getItem() != null ? l.getItem().getTitle() : "Listing";
                    String author = l.getItem() != null ? l.getItem().getAuthor() : "Unikart";
                    String idStr = l.getListingId().toString();
                    String shortId = idStr.length() > 6 ? idStr.substring(idStr.length() - 6).toUpperCase() : idStr.toUpperCase();
                    String stockStatus = availCopies > 0 ? (availCopies + " in stock") : "Out of stock";
                    String tone = availCopies > 0 ? "success" : "danger";

                    rows.add(ManagerOverviewItem.builder()
                            .id("LST-" + shortId)
                            .referenceId(l.getListingId().toString())
                            .title(title)
                            .meta(author + " · " + l.getListingType().replace('_', ' ') + " · Stock: " + availCopies + " available (Total: " + totalCopies + ")")
                            .value("₹" + (l.getSalePrice() != null ? l.getSalePrice().stripTrailingZeros().toPlainString() : "0") + " (" + availCopies + " in stock)")
                            .status(stockStatus)
                            .tone(tone)
                            .secondary("Listing")
                            .type("listing")
                            .build());
                }
                stats.add(ManagerPageStat.builder().label("Active listings").value(String.valueOf(active)).change("Live in catalog").tone("success").build());
                stats.add(ManagerPageStat.builder().label("In-stock titles").value(String.valueOf(inStockCount)).change(outOfStockCount + " out of stock").tone("success").build());
                stats.add(ManagerPageStat.builder().label("Out-of-stock titles").value(String.valueOf(outOfStockCount)).change(outOfStockCount > 0 ? "Restock needed" : "All stocked").tone(outOfStockCount > 0 ? "warning" : "neutral").build());
                stats.add(ManagerPageStat.builder().label("Total catalog items").value(String.valueOf(listings.size())).change("Store coverage").build());
                return ManagerPageResponse.builder().page("listings").title("Listings").description("Manage campus catalog listings, set purchase prices, and monitor live copy stock.").stats(stats).rows(rows).build();
            }
            case "sell-submissions": {
                List<SellSubmission> subs = sellSubmissionRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long pending = 0;
                long approved = 0;
                BigDecimal payouts = BigDecimal.ZERO;
                for (SellSubmission s : subs) {
                    if ("SUBMITTED".equalsIgnoreCase(s.getStatus()) || "QUOTED".equalsIgnoreCase(s.getStatus())) pending++;
                    else if ("APPROVED".equalsIgnoreCase(s.getStatus())) {
                        approved++;
                        payouts = payouts.add(s.getTotalApprovedPayout() != null ? s.getTotalApprovedPayout() : BigDecimal.ZERO);
                    }
                    String sellerName = s.getSeller() != null ? s.getSeller().getFullName() : "Student";
                    int count = s.getLines() != null ? s.getLines().size() : 1;
                    rows.add(ManagerOverviewItem.builder()
                            .id(s.getSubmissionNumber() != null ? s.getSubmissionNumber() : s.getSubmissionId().toString().substring(0, 8))
                            .title(sellerName)
                            .meta(count + (count == 1 ? " book" : " books") + " · Desk submission")
                            .value("₹" + (s.getTotalQuotedAmount() != null ? s.getTotalQuotedAmount().stripTrailingZeros().toPlainString() : "0"))
                            .status(s.getStatus().replace('_', ' '))
                            .tone("APPROVED".equalsIgnoreCase(s.getStatus()) ? "success" : "QUOTED".equalsIgnoreCase(s.getStatus()) ? "warning" : "info")
                            .secondary("Sell submission")
                            .type("sell")
                            .build());
                }
                stats.add(ManagerPageStat.builder().label("Pending quote/accept").value(String.valueOf(pending)).change("Awaiting desk review").tone(pending > 0 ? "warning" : "info").build());
                stats.add(ManagerPageStat.builder().label("Approved buybacks").value(String.valueOf(approved)).change("Added to store stock").tone("success").build());
                stats.add(ManagerPageStat.builder().label("Payouts issued").value("₹" + payouts.setScale(2, RoundingMode.HALF_UP).toPlainString()).change("Wallet credits").build());
                stats.add(ManagerPageStat.builder().label("Total submissions").value(String.valueOf(subs.size())).change("Lifetime").build());
                return ManagerPageResponse.builder().page("sell-submissions").title("Sell to Unikart Submissions").description("Inspect student-submitted used books, confirm algorithmic valuation, and approve instant wallet payouts.").stats(stats).rows(rows).build();
            }
            case "fines": {
                List<Fine> fines = fineRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long outstanding = 0;
                long paid = 0;
                BigDecimal outAmt = BigDecimal.ZERO;
                for (Fine f : fines) {
                    if ("OUTSTANDING".equalsIgnoreCase(f.getStatus())) {
                        outstanding++;
                        outAmt = outAmt.add(f.getAssessedAmount() != null ? f.getAssessedAmount() : BigDecimal.ZERO);
                    } else if ("PAID".equalsIgnoreCase(f.getStatus())) {
                        paid++;
                    }
                    String userStr = f.getUser() != null ? f.getUser().getFullName() : "Student";
                    String reason = f.getReason() != null ? f.getReason() : f.getFineType();
                    String fIdStr = f.getFineId().toString();
                    String shortFineId = fIdStr.length() > 6 ? fIdStr.substring(fIdStr.length() - 6).toUpperCase() : fIdStr.toUpperCase();
                    rows.add(ManagerOverviewItem.builder()
                            .id("FINE-" + shortFineId)
                            .referenceId(f.getFineId().toString())
                            .title(userStr)
                            .meta(reason + " · Borrow fine")
                            .value("₹" + (f.getAssessedAmount() != null ? f.getAssessedAmount().stripTrailingZeros().toPlainString() : "0"))
                            .status(f.getStatus().replace('_', ' '))
                            .tone("OUTSTANDING".equalsIgnoreCase(f.getStatus()) ? "danger" : "PAID".equalsIgnoreCase(f.getStatus()) ? "success" : "info")
                            .secondary("Fine")
                            .type("fine")
                            .build());
                }
                stats.add(ManagerPageStat.builder().label("Outstanding fines").value(String.valueOf(outstanding)).change("Uncollected").tone(outstanding > 0 ? "danger" : "neutral").build());
                stats.add(ManagerPageStat.builder().label("Pending fine total").value("₹" + outAmt.setScale(2, RoundingMode.HALF_UP).toPlainString()).change("Store balance due").tone("danger").build());
                stats.add(ManagerPageStat.builder().label("Settled fines").value(String.valueOf(paid)).change("Paid from deposit/wallet").tone("success").build());
                stats.add(ManagerPageStat.builder().label("Dispute rate").value("0%").change("No active disputes").build());
                return ManagerPageResponse.builder().page("fines").title("Fines & Disputes").description("Review accrued overdue and damage fines, collect settlements, and process student appeals.").stats(stats).rows(rows).build();
            }
            case "delivery-exceptions": {
                List<StoreOrder> orders = storeOrderRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                long failed = 0;
                long cancelled = 0;
                for (StoreOrder o : orders) {
                    if ("DELIVERY_FAILED".equalsIgnoreCase(o.getStatus())) failed++;
                    else if ("CANCELLED".equalsIgnoreCase(o.getStatus()) && "DELIVERY".equalsIgnoreCase(o.getFulfilmentType())) cancelled++;
                    if ("DELIVERY_FAILED".equalsIgnoreCase(o.getStatus()) || ("CANCELLED".equalsIgnoreCase(o.getStatus()) && "DELIVERY".equalsIgnoreCase(o.getFulfilmentType()))) {
                        String custName = o.getUser() != null ? o.getUser().getFullName() : "Customer";
                        rows.add(ManagerOverviewItem.builder()
                                .id(o.getOrderNumber() != null ? o.getOrderNumber() : o.getStoreOrderId().toString().substring(0, 8))
                                .title(custName)
                                .meta((o.getCancellationReason() != null ? o.getCancellationReason() : "Delivery issue") + " · " + (o.getDeliveryAddress() != null ? o.getDeliveryAddress() : "Campus address"))
                                .value("₹" + (o.getTotalAmount() != null ? o.getTotalAmount().stripTrailingZeros().toPlainString() : "0"))
                                .status(o.getStatus().replace('_', ' '))
                                .tone("danger")
                                .secondary("Delivery Exception")
                                .type("delivery")
                                .build());
                    }
                }
                stats.add(ManagerPageStat.builder().label("Failed deliveries").value(String.valueOf(failed)).change(failed > 0 ? "Action required" : "Zero exceptions").tone(failed > 0 ? "danger" : "neutral").build());
                stats.add(ManagerPageStat.builder().label("Cancelled en route").value(String.valueOf(cancelled)).change("Restocked to store").build());
                stats.add(ManagerPageStat.builder().label("Max courier retries").value("3").change("Standard SLA").build());
                stats.add(ManagerPageStat.builder().label("Courier partner").value("Simulated Sandbox").change("Campus Runner Express").tone("info").build());
                return ManagerPageResponse.builder().page("delivery-exceptions").title("Delivery Exceptions").description("Monitor courier delivery exceptions, failed attempts, and campus address issues.").stats(stats).rows(rows).build();
            }
            case "reports": {
                List<StoreOrder> orders = storeOrderRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                List<BorrowRecord> borrows = borrowRecordRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                List<Copy> copies = copyRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
                List<Fine> fines = fineRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);

                BigDecimal totalRevenue = BigDecimal.ZERO;
                long booksSoldCount = 0;
                long validOrdersCount = 0;

                for (StoreOrder o : orders) {
                    if (!"CANCELLED".equalsIgnoreCase(o.getStatus())) {
                        totalRevenue = totalRevenue.add(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO);
                        validOrdersCount++;
                        int lines = (o.getLines() != null && !o.getLines().isEmpty()) ? o.getLines().size() : 1;
                        booksSoldCount += lines;
                    }
                }

                BigDecimal avgOrderVal = validOrdersCount > 0
                        ? totalRevenue.divide(BigDecimal.valueOf(validOrdersCount), 2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                long totalBorrowsCount = borrows.size();
                long overdueBorrowsCount = borrows.stream().filter(b -> "OVERDUE".equalsIgnoreCase(b.getStatus())).count();

                stats.add(ManagerPageStat.builder()
                        .label("Revenue this month")
                        .value("₹" + totalRevenue.setScale(2, RoundingMode.HALF_UP).toPlainString())
                        .change(validOrdersCount + " processed orders")
                        .tone("info")
                        .build());
                stats.add(ManagerPageStat.builder()
                        .label("Books sold")
                        .value(String.valueOf(booksSoldCount))
                        .change("Fulfilled orders")
                        .build());
                stats.add(ManagerPageStat.builder()
                        .label("Books borrowed")
                        .value(String.valueOf(totalBorrowsCount))
                        .change(overdueBorrowsCount + " overdue")
                        .tone(overdueBorrowsCount > 0 ? "danger" : "neutral")
                        .build());
                stats.add(ManagerPageStat.builder()
                        .label("Avg order value")
                        .value("₹" + avgOrderVal.toPlainString())
                        .change("Store average")
                        .build());

                String currentMonth = java.time.YearMonth.now().getMonth().toString().substring(0, 3) + " " + java.time.YearMonth.now().getYear();

                rows.add(ManagerOverviewItem.builder()
                        .id("RPT-SLS-" + java.time.YearMonth.now().getMonthValue())
                        .title("Store Monthly Sales Report")
                        .meta(currentMonth + " · " + validOrdersCount + " orders · Total GMV ₹" + totalRevenue.setScale(2, RoundingMode.HALF_UP).toPlainString())
                        .value("Ready")
                        .status("Ready")
                        .tone("success")
                        .secondary("Sales PDF/CSV")
                        .type("report")
                        .build());

                rows.add(ManagerOverviewItem.builder()
                        .id("RPT-BRW-" + java.time.YearMonth.now().getMonthValue())
                        .title("Circulation & Borrowing Analytics")
                        .meta(currentMonth + " · " + totalBorrowsCount + " loans · " + overdueBorrowsCount + " overdue")
                        .value("Ready")
                        .status("Ready")
                        .tone("success")
                        .secondary("Borrow CSV")
                        .type("report")
                        .build());

                long availableCopies = copies.stream().filter(c -> "AVAILABLE".equalsIgnoreCase(c.getStatus())).count();
                rows.add(ManagerOverviewItem.builder()
                        .id("RPT-INV-" + java.time.YearMonth.now().getMonthValue())
                        .title("Inventory Stock & Valuation Report")
                        .meta(copies.size() + " total physical copies · " + availableCopies + " on shelf")
                        .value("Ready")
                        .status("Ready")
                        .tone("success")
                        .secondary("Stock XLSX")
                        .type("report")
                        .build());

                BigDecimal collectedFines = fines.stream()
                        .filter(f -> "PAID".equalsIgnoreCase(f.getStatus()) || "SETTLED".equalsIgnoreCase(f.getStatus()))
                        .map(f -> f.getAssessedAmount() != null ? f.getAssessedAmount() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                rows.add(ManagerOverviewItem.builder()
                        .id("RPT-FIN-" + java.time.YearMonth.now().getMonthValue())
                        .title("Fine Collection & Penalty Audit")
                        .meta(fines.size() + " total fines · ₹" + collectedFines.setScale(2, RoundingMode.HALF_UP).toPlainString() + " collected")
                        .value("Ready")
                        .status("Ready")
                        .tone("success")
                        .secondary("Audit CSV")
                        .type("report")
                        .build());

                return ManagerPageResponse.builder()
                        .page("reports")
                        .title("Reports & Store Analytics")
                        .description("Store performance, real-time revenue trends, borrowing metrics, and downloadable audits.")
                        .stats(stats)
                        .rows(rows)
                        .build();
            }
            default:
                throw new BusinessException("Unknown manager page: " + page);
        }
    }

    @Transactional
    public BorrowRecordResponse approveAndHandoverBorrow(String borrowIdOrNumber, String otpCode, User manager) {
        BorrowRecord br = null;
        try {
            UUID id = UUID.fromString(borrowIdOrNumber);
            br = borrowRecordRepository.findById(id).orElse(null);
        } catch (IllegalArgumentException ignored) {}

        if (br == null) {
            br = borrowRecordRepository.findByBorrowNumber(borrowIdOrNumber)
                    .orElseThrow(() -> new BusinessException("Borrow record not found: " + borrowIdOrNumber, HttpStatus.NOT_FOUND));
        }

        Store store = resolveManagerStore(manager);
        if (store != null && br.getStore() != null && !store.getStoreId().equals(br.getStore().getStoreId())) {
            if (manager != null && !"PLATFORM_ADMIN".equalsIgnoreCase(manager.getRole())) {
                throw new BusinessException("You are not authorized to handover borrowings for this store", HttpStatus.FORBIDDEN);
            }
        }

        Instant now = Instant.now();
        int days = br.getDurationDays() > 0 ? br.getDurationDays() : 14;

        br.setStatus("ACTIVE");
        br.setHandoverAt(now);
        br.setDueAt(now.plus(Duration.ofDays(days)));
        br.setUpdatedAt(now);

        Copy copy = br.getCopy();
        if (copy != null) {
            copy.setStatus("BORROWED");
            copy.setUpdatedAt(now);
            copyRepository.save(copy);
        }

        if (br.getOrderLine() != null) {
            br.getOrderLine().setStatus("HANDED_OVER");
        }

        StoreOrder so = br.getStoreOrder();
        if (so != null) {
            so.setStatus("HANDED_OVER");
            so.setHandedOverAt(now);
            so.setHandedOverBy(manager);
            so.setUpdatedAt(now);
            storeOrderRepository.save(so);
        }

        br = borrowRecordRepository.save(br);
        return toBorrowRecordResponse(br);
    }

    private BorrowRecordResponse toBorrowRecordResponse(BorrowRecord br) {
        return BorrowRecordResponse.builder()
                .borrowId(br.getBorrowId())
                .borrowNumber(br.getBorrowNumber())
                .orderLineId(br.getOrderLine() != null ? br.getOrderLine().getOrderLineId() : null)
                .storeOrderId(br.getStoreOrder() != null ? br.getStoreOrder().getStoreOrderId() : null)
                .orderNumber(br.getStoreOrder() != null ? br.getStoreOrder().getOrderNumber() : null)
                .itemId(br.getItem() != null ? br.getItem().getItemId() : null)
                .itemTitle(br.getItem() != null ? br.getItem().getTitle() : null)
                .author(br.getItem() != null ? br.getItem().getAuthor() : null)
                .isbnOrCode(br.getItem() != null ? br.getItem().getIsbnOrCode() : null)
                .copyId(br.getCopy() != null ? br.getCopy().getCopyId() : null)
                .copyCode(br.getCopy() != null ? br.getCopy().getCopyCode() : null)
                .duration(br.getDuration())
                .durationDays(br.getDurationDays())
                .status(br.getStatus())
                .borrowFeePaid(br.getBorrowFeePaid())
                .depositHeld(br.getDepositHeld())
                .depositDeducted(br.getDepositDeducted())
                .depositRefunded(br.getDepositRefunded())
                .handoverAt(br.getHandoverAt())
                .dueAt(br.getDueAt())
                .renewedCount(br.getRenewedCount())
                .returnRoute(br.getReturnRoute())
                .returnInitiatedAt(br.getReturnInitiatedAt())
                .receivedAtStoreAt(br.getReceivedAtStoreAt())
                .inspectedAt(br.getInspectedAt())
                .returnCondition(br.getReturnCondition())
                .inspectionNotes(br.getInspectionNotes())
                .closedAt(br.getClosedAt())
                .createdAt(br.getCreatedAt())
                .build();
    }
}