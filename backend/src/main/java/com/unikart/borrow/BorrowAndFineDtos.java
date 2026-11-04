package com.unikart.borrow;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class BorrowAndFineDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RenewBorrowRequest {
        @NotBlank(message = "Idempotency key is required")
        private String idempotencyKey;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReturnInitiateRequest {
        @NotBlank(message = "Return route is required (STORE_COUNTER or PARTNER_PICKUP)")
        private String returnRoute;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InspectReturnRequest {
        @NotBlank(message = "Return condition is required (NEW, GOOD, FAIR, DAMAGED, LOST)")
        private String returnCondition;

        private String inspectionNotes;

        @Builder.Default
        private BigDecimal damageOrLossAssessmentAmount = BigDecimal.ZERO;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DisputeFineRequest {
        @NotBlank(message = "Dispute reason is required (PEN-08)")
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewDisputeRequest {
        @NotBlank(message = "Manager response is required")
        private String managerResponse;

        @NotBlank(message = "Decision is required (UPHELD, ADJUSTED, WAIVED)")
        private String decision;

        private BigDecimal adjustedAmount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BorrowRecordResponse {
        private UUID borrowId;
        private String borrowNumber;
        private UUID orderLineId;
        private UUID storeOrderId;
        private String orderNumber;
        private UUID itemId;
        private String itemTitle;
        private String author;
        private String isbnOrCode;
        private UUID copyId;
        private String copyCode;
        private String duration;
        private int durationDays;
        private String status;
        private BigDecimal borrowFeePaid;
        private BigDecimal depositHeld;
        private BigDecimal depositDeducted;
        private BigDecimal depositRefunded;
        private Instant handoverAt;
        private Instant dueAt;
        private int renewedCount;
        private String returnRoute;
        private Instant returnInitiatedAt;
        private Instant receivedAtStoreAt;
        private Instant inspectedAt;
        private String returnCondition;
        private String inspectionNotes;
        private Instant closedAt;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FineResponse {
        private UUID fineId;
        private String fineNumber;
        private UUID borrowId;
        private String borrowNumber;
        private String itemTitle;
        private String fineType;
        private int overdueDays;
        private BigDecimal dailyRate;
        private BigDecimal assessedAmount;
        private BigDecimal adjustedAmount;
        private BigDecimal depositDeductedAmount;
        private BigDecimal shortfallDueAmount;
        private String reason;
        private String evidenceNotes;
        private String status;
        private Instant notifiedAt;
        private UUID disputeId;
        private String disputeStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DueResponse {
        private UUID dueId;
        private UUID fineId;
        private String fineNumber;
        private BigDecimal originalShortfall;
        private BigDecimal outstandingAmount;
        private boolean disputed;
        private boolean blocksBorrowing;
        private String status;
        private Instant createdAt;
    }
}
