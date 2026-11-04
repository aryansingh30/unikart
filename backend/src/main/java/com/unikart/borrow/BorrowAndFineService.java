package com.unikart.borrow;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Locale;
import java.util.UUID;
import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import com.unikart.borrow.BorrowAndFineDtos.*;
import com.unikart.catalog.Copy;
import com.unikart.catalog.CopyRepository;
import com.unikart.catalog.WaitlistEntryRepository;
import com.unikart.common.BusinessException;
import com.unikart.institution.Store;
import com.unikart.order.*;
import com.unikart.wallet.Wallet;
import com.unikart.wallet.WalletRepository;
import com.unikart.wallet.WalletTransaction;
import com.unikart.wallet.WalletTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unikart.catalog.CatalogAndInventoryService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class BorrowAndFineService {

    private static final BigDecimal DEFAULT_LATE_FINE_PER_DAY = new BigDecimal("15.00");
    private static final BigDecimal DEFAULT_RENEWAL_FEE_PCT = new BigDecimal("10.00");
    private static final int DISPUTE_WINDOW_DAYS = 7;
    private static final int MANAGER_DISPUTE_RESPONSE_DAYS = 3;

    private final BorrowRecordRepository borrowRecordRepository;
    private final RenewalRepository renewalRepository;
    private final FineRepository fineRepository;
    private final DueRepository dueRepository;
    private final FineDisputeRepository fineDisputeRepository;
    private final CopyRepository copyRepository;
    private final WaitlistEntryRepository waitlistEntryRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final DeliveryJobRepository deliveryJobRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final CatalogAndInventoryService catalogService;

    public BorrowAndFineService(
            BorrowRecordRepository borrowRecordRepository,
            RenewalRepository renewalRepository,
            FineRepository fineRepository,
            DueRepository dueRepository,
            FineDisputeRepository fineDisputeRepository,
            CopyRepository copyRepository,
            WaitlistEntryRepository waitlistEntryRepository,
            PaymentRepository paymentRepository,
            RefundRepository refundRepository,
            DeliveryJobRepository deliveryJobRepository,
            WalletRepository walletRepository,
            WalletTransactionRepository walletTransactionRepository,
            CatalogAndInventoryService catalogService) {
        this.borrowRecordRepository = borrowRecordRepository;
        this.renewalRepository = renewalRepository;
        this.fineRepository = fineRepository;
        this.dueRepository = dueRepository;
        this.fineDisputeRepository = fineDisputeRepository;
        this.copyRepository = copyRepository;
        this.waitlistEntryRepository = waitlistEntryRepository;
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.deliveryJobRepository = deliveryJobRepository;
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.catalogService = catalogService;
    }

    /**
     * BOR-06: Renew a borrow once before its due date.
     * Refused if another customer is waiting on the waitlist for that Item.
     */
    @Transactional
    public BorrowRecordResponse renewBorrow(UUID borrowId, RenewBorrowRequest req, User customer) {
        BorrowRecord br = borrowRecordRepository.findById(borrowId)
                .orElseThrow(() -> new BusinessException("Borrow record not found", HttpStatus.NOT_FOUND));

        if (!br.getUser().getUserId().equals(customer.getUserId())) {
            throw new BusinessException("You can only renew your own active borrows", HttpStatus.FORBIDDEN);
        }
        if (!"ACTIVE".equalsIgnoreCase(br.getStatus()) && !"RENEWED".equalsIgnoreCase(br.getStatus())) {
            throw new BusinessException("Borrow cannot be renewed from status: " + br.getStatus());
        }
        if (br.getRenewedCount() >= 1) {
            throw new BusinessException("BOR-06: Borrow has already been renewed once and cannot be renewed again");
        }
        if (Instant.now().isAfter(br.getDueAt())) {
            throw new BusinessException("BOR-06: Cannot renew an overdue borrow");
        }

        // Refused when another customer is waiting on the waitlist (CAT-05 / BOR-06)
        boolean waitlistExists = waitlistEntryRepository.existsByItem_ItemIdAndStore_StoreIdAndStatusIn(
                br.getItem().getItemId(), br.getStore().getStoreId(), List.of("WAITING", "NOTIFIED"));
        if (waitlistExists) {
            throw new BusinessException("BOR-06: Renewal refused because another customer is waiting on the waitlist for this item");
        }

        BigDecimal renewalFee = br.getItem().getBaseValue()
                .multiply(DEFAULT_RENEWAL_FEE_PCT)
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

        Wallet wallet = getOrCreateWallet(customer);
        if (wallet.getAvailableBalance().compareTo(renewalFee) < 0) {
            throw new BusinessException("WAL-08: Insufficient wallet balance to pay renewal fee of ₹" + renewalFee);
        }

        BigDecimal newBal = wallet.getAvailableBalance().subtract(renewalFee).setScale(2, RoundingMode.HALF_UP);
        wallet.setAvailableBalance(newBal);
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);

        WalletTransaction wTx = WalletTransaction.builder()
                .wallet(wallet)
                .user(customer)
                .idempotencyKey(req.getIdempotencyKey().trim() + "-RENEW")
                .txType("RENEWAL_DEBIT")
                .direction("DEBIT")
                .amount(renewalFee)
                .state("SUCCESS")
                .balanceAfter(newBal)
                .reservedAfter(wallet.getReservedBalance())
                .referenceType("BORROW_RENEWAL")
                .referenceId(br.getBorrowId().toString())
                .description("Renewal fee for borrow " + br.getBorrowNumber())
                .build();
        walletTransactionRepository.save(wTx);

        Payment payment = paymentRepository.save(Payment.builder()
                .user(customer)
                .paymentPurpose("BORROW_RENEWAL")
                .referenceEntityId(br.getBorrowId())
                .method("WALLET")
                .amount(renewalFee)
                .status("SUCCESS")
                .idempotencyKey(req.getIdempotencyKey().trim() + "-PAY-RENEW")
                .providerReference("WAL-" + wTx.getTxId())
                .build());

        Instant prevDue = br.getDueAt();
        Instant newDue = prevDue.plus(Duration.ofDays(br.getDurationDays()));

        br.setStatus("RENEWED");
        br.setRenewedCount(1);
        br.setDueAt(newDue);
        br.setUpdatedAt(Instant.now());
        borrowRecordRepository.save(br);

        Renewal renewal = Renewal.builder()
                .borrowRecord(br)
                .user(customer)
                .payment(payment)
                .extensionDays(br.getDurationDays())
                .renewalFee(renewalFee)
                .previousDueAt(prevDue)
                .newDueAt(newDue)
                .build();
        renewalRepository.save(renewal);

        return toBorrowRecordResponse(br);
    }

    /**
     * BOR-08 & FUL-05: Customer initiates return via STORE_COUNTER or PARTNER_PICKUP.
     */
    @Transactional
    public BorrowRecordResponse initiateReturn(UUID borrowId, ReturnInitiateRequest req, User customer) {
        BorrowRecord br = borrowRecordRepository.findById(borrowId)
                .orElseThrow(() -> new BusinessException("Borrow record not found", HttpStatus.NOT_FOUND));

        if (!br.getUser().getUserId().equals(customer.getUserId())) {
            throw new BusinessException("You can only initiate return for your own borrow", HttpStatus.FORBIDDEN);
        }

        String route = req.getReturnRoute().trim().toUpperCase(Locale.ROOT);
        if (!"STORE_COUNTER".equals(route) && !"PARTNER_PICKUP".equals(route)) {
            throw new BusinessException("Invalid return route: must be STORE_COUNTER or PARTNER_PICKUP");
        }

        // BR-12 / BOR-08: Cross-institution borrows must use partner pickup
        if (br.getStoreOrder().isCrossInstitution() && "STORE_COUNTER".equals(route)) {
            throw new BusinessException("BR-12 / BOR-08 violation: Cross-institution borrow returns must use PARTNER_PICKUP");
        }

        Instant now = Instant.now();
        br.setStatus("RETURN_INITIATED");
        br.setReturnRoute(route);
        br.setReturnInitiatedAt(now);
        br.setUpdatedAt(now);
        borrowRecordRepository.save(br);

        if ("PARTNER_PICKUP".equals(route)) {
            deliveryJobRepository.save(DeliveryJob.builder()
                    .jobNumber("DLV-RET-" + System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(100, 999))
                    .borrowRecord(br)
                    .store(br.getStore())
                    .user(customer)
                    .direction("RETURN_PICKUP")
                    .crossInstitution(br.getStoreOrder().isCrossInstitution())
                    .idempotencyKey("RET-JOB-" + br.getBorrowId())
                    .providerTrackingRef("TRK-RET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                    .pickupAddress(br.getStoreOrder().getDeliveryAddress() != null ? br.getStoreOrder().getDeliveryAddress() : "Customer Campus Address")
                    .destinationAddress(br.getStore().getLocationDetails())
                    .deliveryCharge(BigDecimal.ZERO)
                    .status("ASSIGNED")
                    .build());
        }

        return toBorrowRecordResponse(br);
    }

    /**
     * BOR-09, PEN-01..03:
     * Store Manager inspects the returned Copy, records condition, calculates late fines (₹15/day)
     * and damage/loss fines, deducts from deposit first, refunds remaining deposit, and closes borrow.
     */
    @Transactional
    public BorrowRecordResponse inspectReturn(UUID borrowId, InspectReturnRequest req, User manager) {
        BorrowRecord br = borrowRecordRepository.findById(borrowId)
                .orElseThrow(() -> new BusinessException("Borrow record not found", HttpStatus.NOT_FOUND));

        verifyStoreManagerAccess(br.getStore().getStoreId(), manager);

        if (!"RETURN_INITIATED".equals(br.getStatus()) && !"ACTIVE".equals(br.getStatus()) && !"OVERDUE".equals(br.getStatus())) {
            throw new BusinessException("Borrow is not in a returnable state (current: " + br.getStatus() + ")");
        }

        Instant now = Instant.now();
        String returnCond = req.getReturnCondition().trim().toUpperCase(Locale.ROOT);

        br.setStatus("INSPECTION");
        br.setReceivedAtStoreAt(now);
        br.setInspectedAt(now);
        br.setInspectedBy(manager);
        br.setReturnCondition(returnCond);
        br.setInspectionNotes(req.getInspectionNotes());

        // Update physical Copy condition and status back to AVAILABLE
        Copy copy = br.getCopy();
        copy.setCondition(returnCond);
        copy.setStatus("AVAILABLE");
        copy.setUpdatedAt(now);
        copyRepository.save(copy);
        catalogService.notifyWaitlistIfBorrowableCopyAvailable(copy.getItem().getItemId(), copy.getStore().getStoreId());

        // Calculate late fine (PEN-01): flat ₹15 per day overdue
        BigDecimal lateFineAmt = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        int overdueDays = 0;
        if (now.isAfter(br.getDueAt())) {
            long diffSec = Duration.between(br.getDueAt(), now).getSeconds();
            overdueDays = (int) Math.ceil(diffSec / 86400.0);
            lateFineAmt = DEFAULT_LATE_FINE_PER_DAY.multiply(BigDecimal.valueOf(overdueDays))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal damageLossAmt = req.getDamageOrLossAssessmentAmount() != null
                ? req.getDamageOrLossAssessmentAmount().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalFineAssessed = lateFineAmt.add(damageLossAmt).setScale(2, RoundingMode.HALF_UP);

        BigDecimal depositHeld = br.getDepositHeld();
        BigDecimal depositDeducted = totalFineAssessed.min(depositHeld).setScale(2, RoundingMode.HALF_UP);
        BigDecimal depositRefunded = depositHeld.subtract(depositDeducted).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        BigDecimal shortfallDue = totalFineAssessed.subtract(depositDeducted).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        br.setDepositDeducted(depositDeducted);
        br.setDepositRefunded(depositRefunded);

        boolean hasFine = totalFineAssessed.compareTo(BigDecimal.ZERO) > 0;
        br.setStatus(hasFine ? "CLOSED_WITH_FINE" : "CLOSED");
        br.setClosedAt(now);
        br.setUpdatedAt(now);
        borrowRecordRepository.save(br);

        // Refund remaining deposit to customer wallet (WAL-02)
        if (depositRefunded.compareTo(BigDecimal.ZERO) > 0) {
            Wallet wallet = getOrCreateWallet(br.getUser());
            BigDecimal newBal = wallet.getAvailableBalance().add(depositRefunded).setScale(2, RoundingMode.HALF_UP);
            wallet.setAvailableBalance(newBal);
            wallet.setUpdatedAt(now);
            walletRepository.save(wallet);

            walletTransactionRepository.save(WalletTransaction.builder()
                    .wallet(wallet)
                    .user(br.getUser())
                    .idempotencyKey("BOR-DEP-REF-" + br.getBorrowId())
                    .txType("REFUND_CREDIT")
                    .direction("CREDIT")
                    .amount(depositRefunded)
                    .state("SUCCESS")
                    .balanceAfter(newBal)
                    .reservedAfter(wallet.getReservedBalance())
                    .referenceType("BORROW_RECORD")
                    .referenceId(br.getBorrowId().toString())
                    .description("Refund of remaining deposit for borrow " + br.getBorrowNumber())
                    .build());
        }

        // If fine assessed, create Fine record (PEN-01..03)
        if (hasFine) {
            String fineType = overdueDays > 0 && damageLossAmt.compareTo(BigDecimal.ZERO) == 0 ? "LATE_RETURN"
                    : damageLossAmt.compareTo(BigDecimal.ZERO) > 0 && overdueDays == 0 ? "DAMAGE"
                    : "LOSS";

            Fine fine = Fine.builder()
                    .fineNumber("FINE-" + System.currentTimeMillis() + "-" + ThreadLocalRandom.current().nextInt(100, 999))
                    .borrowRecord(br)
                    .user(br.getUser())
                    .store(br.getStore())
                    .fineType(fineType)
                    .overdueDays(overdueDays)
                    .dailyRate(overdueDays > 0 ? DEFAULT_LATE_FINE_PER_DAY : null)
                    .assessedAmount(totalFineAssessed)
                    .adjustedAmount(totalFineAssessed)
                    .depositDeductedAmount(depositDeducted)
                    .shortfallDueAmount(shortfallDue)
                    .reason(req.getInspectionNotes() != null ? req.getInspectionNotes() : "Return inspection fine")
                    .assessedBy(manager)
                    .status(depositDeducted.compareTo(totalFineAssessed) >= 0 ? "SETTLED_FROM_DEPOSIT" : "DUE_PENDING")
                    .build();
            fine = fineRepository.save(fine);

            // PEN-04 & BOR-11: If shortfall due exists, create Due record and block borrowing
            if (shortfallDue.compareTo(BigDecimal.ZERO) > 0) {
                Due due = Due.builder()
                        .fine(fine)
                        .user(br.getUser())
                        .originalShortfall(shortfallDue)
                        .outstandingAmount(shortfallDue)
                        .blocksBorrowing(true)
                        .status("UNPAID")
                        .build();
                dueRepository.save(due);

                User customer = br.getUser();
                customer.setBlockedFlag(true);
                customer.setBlockReason("Unpaid undisputed due of ₹" + shortfallDue + " from fine " + fine.getFineNumber());
                userRepository.save(customer);
            }
        }

        return toBorrowRecordResponse(br);
    }

    /**
     * PEN-08, BOR-11: Customer disputes a fine within 7 calendar days of notification.
     * Disputed amount does not add a new borrowing block until resolution.
     */
    @Transactional
    public FineResponse disputeFine(UUID fineId, DisputeFineRequest req, User customer) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(() -> new BusinessException("Fine not found", HttpStatus.NOT_FOUND));

        if (!fine.getUser().getUserId().equals(customer.getUserId())) {
            throw new BusinessException("You can only dispute your own fines", HttpStatus.FORBIDDEN);
        }

        long daysSinceNotified = ChronoUnit.DAYS.between(fine.getNotifiedAt(), Instant.now());
        if (daysSinceNotified > DISPUTE_WINDOW_DAYS) {
            throw new BusinessException("PEN-08: Fine dispute window of " + DISPUTE_WINDOW_DAYS + " calendar days has expired");
        }

        if ("DISPUTED".equals(fine.getStatus()) || "PAID".equals(fine.getStatus()) || "WAIVED".equals(fine.getStatus())) {
            throw new BusinessException("Fine is already in status: " + fine.getStatus());
        }

        fine.setStatus("DISPUTED");
        fine.setUpdatedAt(Instant.now());
        fineRepository.save(fine);

        
        // Update corresponding due to mark disputed = true (BOR-11: removes borrowing block during dispute)
        dueRepository.findByFine_FineId(fine.getFineId()).ifPresent(due -> {
            due.setDisputed(true);
            due.setBlocksBorrowing(false);
            due.setUpdatedAt(Instant.now());
            dueRepository.save(due);
        });

        // Clear user block flag if this was the only blocking due
        User user = fine.getUser();
        if (user.isBlockedFlag()) {
            boolean hasOtherBlockingDues = dueRepository.findByUser_UserIdAndStatus(user.getUserId(), "UNPAID").stream()
                    .anyMatch(d -> d.isBlocksBorrowing() && !d.isDisputed());
            if (!hasOtherBlockingDues) {
                user.setBlockedFlag(false);
                user.setBlockReason(null);
                userRepository.save(user);
            }
        }

        Instant targetDue = Instant.now().plus(Duration.ofDays(MANAGER_DISPUTE_RESPONSE_DAYS));
        FineDispute dispute = FineDispute.builder()
                .fine(fine)
                .user(customer)
                .store(fine.getStore())
                .customerReason(req.getReason().trim())
                .disputedAmount(fine.getAssessedAmount())
                .status("SUBMITTED")
                .managerTargetDueAt(targetDue)
                .build();
        dispute = fineDisputeRepository.save(dispute);

        return toFineResponse(fine, dispute);
    }

    /**
     * Store Manager reviews and resolves a fine dispute.
     */
    @Transactional
    public FineResponse reviewDispute(UUID disputeId, ReviewDisputeRequest req, User manager) {
        FineDispute dispute = fineDisputeRepository.findById(disputeId)
                .orElseThrow(() -> new BusinessException("Fine dispute not found", HttpStatus.NOT_FOUND));

        verifyStoreManagerAccess(dispute.getStore().getStoreId(), manager);

        Fine fine = dispute.getFine();
        String decision = req.getDecision().trim().toUpperCase(Locale.ROOT);
        Instant now = Instant.now();

        dispute.setManagerResponse(req.getManagerResponse().trim());
        dispute.setManagerReviewedBy(manager);
        dispute.setManagerReviewedAt(now);
        dispute.setStatus(decision);
        dispute.setUpdatedAt(now);
        fineDisputeRepository.save(dispute);

        if ("WAIVED".equals(decision)) {
            fine.setStatus("WAIVED");
            fine.setAdjustedAmount(BigDecimal.ZERO);
            fine.setShortfallDueAmount(BigDecimal.ZERO);
            fine.setUpdatedAt(now);
            fineRepository.save(fine);

            dueRepository.findByFine_FineId(fine.getFineId()).ifPresent(due -> {
                due.setStatus("WAIVED");
                due.setOutstandingAmount(BigDecimal.ZERO);
                due.setUpdatedAt(now);
                dueRepository.save(due);
            });

            User customer = fine.getUser();
            refreshCustomerBlockStatus(customer);
        } else if ("ADJUSTED".equals(decision)) {
            BigDecimal adjAmt = req.getAdjustedAmount() != null ? req.getAdjustedAmount() : fine.getAssessedAmount();
            fine.setStatus("DUE_PENDING");
            fine.setAdjustedAmount(adjAmt);
            BigDecimal newShortfall = adjAmt.subtract(fine.getDepositDeductedAmount()).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            fine.setShortfallDueAmount(newShortfall);
            fine.setUpdatedAt(now);
            fineRepository.save(fine);

            dueRepository.findByFine_FineId(fine.getFineId()).ifPresent(due -> {
                due.setDisputed(false);
                due.setBlocksBorrowing(newShortfall.compareTo(BigDecimal.ZERO) > 0);
                due.setOutstandingAmount(newShortfall);
                due.setStatus(newShortfall.compareTo(BigDecimal.ZERO) == 0 ? "PAID" : "UNPAID");
                due.setUpdatedAt(now);
                dueRepository.save(due);
            });

            User customer = fine.getUser();
            refreshCustomerBlockStatus(customer);
        } else {
            // UPHELD
            fine.setStatus("DUE_PENDING");
            BigDecimal shortfall = fine.getShortfallDueAmount();
            dueRepository.findByFine_FineId(fine.getFineId()).ifPresent(due -> {
                due.setDisputed(false);
                due.setBlocksBorrowing(shortfall.compareTo(BigDecimal.ZERO) > 0);
                due.setOutstandingAmount(shortfall);
                due.setStatus(shortfall.compareTo(BigDecimal.ZERO) == 0 ? "PAID" : "UNPAID");
                due.setUpdatedAt(now);
                dueRepository.save(due);
            });

            User customer = fine.getUser();
            refreshCustomerBlockStatus(customer);
        }

        return toFineResponse(fine, dispute);
    }

    @Transactional(readOnly = true)
    public List<BorrowRecordResponse> getCustomerBorrows(User customer) {
        return borrowRecordRepository.findByUser_UserIdOrderByCreatedAtDesc(customer.getUserId())
                .stream()
                .map(this::toBorrowRecordResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FineResponse> getCustomerFines(User customer) {
        return fineRepository.findByUser_UserIdOrderByCreatedAtDesc(customer.getUserId())
                .stream()
                .map(f -> {
                    Optional<FineDispute> dOpt = fineDisputeRepository.findByFine_FineId(f.getFineId());
                    return toFineResponse(f, dOpt.orElse(null));
                })
                .collect(Collectors.toList());
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

    private void verifyStoreManagerAccess(UUID storeId, User actor) {
        if (actor == null || (!"STORE_MANAGER".equalsIgnoreCase(actor.getRole()) && !"PLATFORM_ADMIN".equalsIgnoreCase(actor.getRole()))) {
            throw new BusinessException("Only Store Manager or Platform Admin can perform this action", HttpStatus.FORBIDDEN);
        }
        if ("STORE_MANAGER".equalsIgnoreCase(actor.getRole())) {
            if (actor.getAssignedStore() == null || !actor.getAssignedStore().getStoreId().equals(storeId)) {
                throw new BusinessException("AUTH-04: Store Manager cannot manage another store's borrow records", HttpStatus.FORBIDDEN);
            }
        }
    }

    private void refreshCustomerBlockStatus(User customer) {
        boolean hasUnpaidBlockingDues = dueRepository.findByUser_UserIdAndStatus(customer.getUserId(), "UNPAID").stream()
                .anyMatch(d -> d.isBlocksBorrowing() && !d.isDisputed());
        customer.setBlockedFlag(hasUnpaidBlockingDues);
        if (!hasUnpaidBlockingDues) {
            customer.setBlockReason(null);
        }
        userRepository.save(customer);
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

    private FineResponse toFineResponse(Fine f, FineDispute d) {
        String title = null;
        UUID borrowId = null;
        String borrowNumber = null;
        if (f.getBorrowRecord() != null) {
            borrowId = f.getBorrowRecord().getBorrowId();
            borrowNumber = f.getBorrowRecord().getBorrowNumber();
            if (f.getBorrowRecord().getItem() != null) {
                title = f.getBorrowRecord().getItem().getTitle();
            }
        }
        return FineResponse.builder()
                .fineId(f.getFineId())
                .fineNumber(f.getFineNumber())
                .borrowId(borrowId)
                .borrowNumber(borrowNumber)
                .itemTitle(title)
                .fineType(f.getFineType())
                .overdueDays(f.getOverdueDays())
                .dailyRate(f.getDailyRate())
                .assessedAmount(f.getAssessedAmount())
                .adjustedAmount(f.getAdjustedAmount())
                .depositDeductedAmount(f.getDepositDeductedAmount())
                .shortfallDueAmount(f.getShortfallDueAmount())
                .reason(f.getReason())
                .evidenceNotes(f.getEvidenceNotes())
                .status(f.getStatus())
                .notifiedAt(f.getNotifiedAt())
                .disputeId(d != null ? d.getDisputeId() : null)
                .disputeStatus(d != null ? d.getStatus() : null)
                .build();
    }

    @Autowired
    private UserRepository userRepository;
}
