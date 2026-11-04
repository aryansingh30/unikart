package com.unikart.admin;

import com.unikart.auth.OtpTokenRepository;
import com.unikart.borrow.BorrowRecord;
import com.unikart.borrow.BorrowRecordRepository;
import com.unikart.borrow.Fine;
import com.unikart.borrow.FineRepository;
import com.unikart.catalog.Copy;
import com.unikart.catalog.CopyRepository;
import com.unikart.notification.Notification;
import com.unikart.notification.NotificationRepository;
import com.unikart.order.OrderLine;
import com.unikart.order.StoreOrder;
import com.unikart.order.StoreOrderRepository;
import com.unikart.wallet.WalletService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class LifecycleScheduledTasks {

    private static final Logger log = LoggerFactory.getLogger(LifecycleScheduledTasks.class);

    private final StoreOrderRepository storeOrderRepository;
    private final CopyRepository copyRepository;
    private final BorrowRecordRepository borrowRecordRepository;
    private final FineRepository fineRepository;
    private final WalletService walletService;
    private final NotificationRepository notificationRepository;
    private final OtpTokenRepository otpTokenRepository;
    private final AuditService auditService;

    public LifecycleScheduledTasks(
            StoreOrderRepository storeOrderRepository,
            CopyRepository copyRepository,
            BorrowRecordRepository borrowRecordRepository,
            FineRepository fineRepository,
            WalletService walletService,
            NotificationRepository notificationRepository,
            OtpTokenRepository otpTokenRepository,
            AuditService auditService) {
        this.storeOrderRepository = storeOrderRepository;
        this.copyRepository = copyRepository;
        this.borrowRecordRepository = borrowRecordRepository;
        this.fineRepository = fineRepository;
        this.walletService = walletService;
        this.notificationRepository = notificationRepository;
        this.otpTokenRepository = otpTokenRepository;
        this.auditService = auditService;
    }

    /**
     * FUL-02: Self-pickup expiry job.
     * Orders uncollected after the 7-day pickup deadline are auto-cancelled,
     * allocated copies are restocked to AVAILABLE, and deposits are refunded
     * to the customer's wallet after deducting the 10% no-show fee.
     */
    @Scheduled(cron = "0 0 * * * *") // Every hour
    @Transactional
    public int processPickupExpiry() {
        log.info("Running pickup expiry automated task...");
        List<StoreOrder> expiredOrders = storeOrderRepository
                .findByStatusAndPickupDeadlineAtBefore("READY_FOR_PICKUP", Instant.now());

        int count = 0;
        for (StoreOrder order : expiredOrders) {
            order.setStatus("CANCELLED");
            order.setCancelledAt(Instant.now());
            order.setCancellationReason("Self-pickup window expired (7 days). Copies restocked.");

            // Restock copies
            for (OrderLine line : order.getLines()) {
                if (line.getAllocatedCopy() != null) {
                    Copy copy = line.getAllocatedCopy();
                    copy.setStatus("AVAILABLE");
                    copy.setConditionNotes("Restocked from expired pickup order " + order.getOrderNumber());
                    copyRepository.save(copy);
                }
            }

            // Refund deposit minus 10% no-show fee (FUL-02)
            if (order.getDepositAmount() != null && order.getDepositAmount().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal deposit = order.getDepositAmount();
                BigDecimal deduction = deposit.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
                BigDecimal refundAmt = deposit.subtract(deduction).setScale(2, RoundingMode.HALF_UP);

                walletService.creditWallet(
                        order.getUser(),
                        refundAmt,
                        "REFUND_CREDIT",
                        "STORE_ORDER",
                        order.getStoreOrderId().toString(),
                        "Deposit refund (10% no-show fee deducted) for expired order " + order.getOrderNumber()
                );
            }

            storeOrderRepository.save(order);

            // In-app notification
            Notification notif = Notification.builder()
                    .user(order.getUser())
                    .channel("IN_APP")
                    .eventType("ORDER_EXPIRED")
                    .mandatory(true)
                    .title("Order Pickup Expired: " + order.getOrderNumber())
                    .message("Your order was uncollected within the 7-day pickup window and has been cancelled. " +
                            "Security deposit has been refunded to your wallet minus the 10% no-show fee.")
                    .actionLink("/customer/orders")
                    .build();
            notificationRepository.save(notif);

            auditService.recordAudit(
                    null,
                    "PICKUP_EXPIRED_AUTOCANCEL",
                    "STORE_ORDER",
                    order.getStoreOrderId().toString(),
                    order.getStore(),
                    "READY_FOR_PICKUP",
                    "CANCELLED",
                    "7-day self-pickup deadline passed without collection",
                    "SYSTEM",
                    null
            );
            count++;
        }
        log.info("Pickup expiry completed: {} orders cancelled and restocked.", count);
        return count;
    }

    /**
     * PEN-01: Daily overdue fine accrual job.
     * Computes accrued overdue fines at flat INR 15/day for all active/overdue borrows.
     */
    @Scheduled(cron = "0 0 0 * * *") // Daily at midnight
    @Transactional
    public int processDailyOverdueFines() {
        log.info("Running daily overdue fine calculation task...");
        List<BorrowRecord> activeBorrows = borrowRecordRepository.findByStatusIn(List.of("ACTIVE", "OVERDUE"));

        int count = 0;
        Instant now = Instant.now();
        BigDecimal dailyRate = new BigDecimal("15.00");

        for (BorrowRecord borrow : activeBorrows) {
            if (borrow.getDueAt() != null && borrow.getDueAt().isBefore(now)) {
                long days = ChronoUnit.DAYS.between(borrow.getDueAt(), now);
                if (days <= 0) days = 1;

                borrow.setStatus("OVERDUE");
                borrowRecordRepository.save(borrow);

                List<Fine> existingFines = fineRepository.findByBorrowRecord_BorrowId(borrow.getBorrowId());
                Fine fine;
                if (!existingFines.isEmpty()) {
                    fine = existingFines.get(0);
                    fine.setOverdueDays((int) days);
                    fine.setAssessedAmount(dailyRate.multiply(BigDecimal.valueOf(days)));
                    fine.setAdjustedAmount(fine.getAssessedAmount());
                } else {
                    fine = Fine.builder()
                            .fineNumber("FN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                            .borrowRecord(borrow)
                            .user(borrow.getUser())
                            .store(borrow.getStore())
                            .fineType("LATE_RETURN")
                            .overdueDays((int) days)
                            .dailyRate(dailyRate)
                            .assessedAmount(dailyRate.multiply(BigDecimal.valueOf(days)))
                            .adjustedAmount(dailyRate.multiply(BigDecimal.valueOf(days)))
                            .reason("Automatic fine calculation for " + days + " overdue days")
                            .status("ASSESSED")
                            .build();
                }
                fineRepository.save(fine);

                Notification notif = Notification.builder()
                        .user(borrow.getUser())
                        .channel("IN_APP")
                        .eventType("BORROW_OVERDUE")
                        .mandatory(true)
                        .title("Overdue Book Notice: " + borrow.getItem().getTitle())
                        .message("Your borrow (" + borrow.getBorrowNumber() + ") is " + days +
                                " day(s) overdue. Late fine accruing at ₹" + dailyRate + "/day. Please return immediately.")
                        .actionLink("/customer/fines")
                        .build();
                notificationRepository.save(notif);

                count++;
            }
        }
        log.info("Daily overdue fines completed: {} records processed.", count);
        return count;
    }

    /**
     * DPDP-01: Data retention and hygiene compliance.
     * Purges expired OTP tokens older than 24 hours and cleans transient state.
     */
    @Scheduled(cron = "0 0 2 * * *") // Daily at 2:00 AM
    @Transactional
    public void processDpdpDataRetention() {
        log.info("Running DPDP retention compliance job...");
        Instant threshold = Instant.now().minus(24, ChronoUnit.HOURS);
        otpTokenRepository.deleteByExpiresAtBefore(threshold);

        auditService.recordAudit(
                null,
                "DPDP_RETENTION_HYGIENE",
                "SYSTEM",
                "OTP_TOKENS",
                null,
                null,
                "PURGED",
                "Purged expired transient authentication tokens older than 24 hours per DPDP policy",
                "SYSTEM",
                null
        );
        log.info("DPDP retention task completed successfully.");
    }
}
