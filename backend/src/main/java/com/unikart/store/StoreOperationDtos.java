package com.unikart.store;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class StoreOperationDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SellLineQuoteInput {
        @NotNull(message = "Item ID is required")
        private UUID itemId;

        @NotBlank(message = "Assessed condition is required")
        private String assessedCondition;

        @NotNull(message = "Quoted amount is required")
        @DecimalMin(value = "0.0", inclusive = true)
        private BigDecimal quotedAmount;

        private String intendedListingType;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateSellSubmissionRequest {
        @NotBlank(message = "Seller email is required")
        private String sellerEmail;

        private String visitNotes;

        @NotEmpty(message = "At least one sell line is required")
        private List<SellLineQuoteInput> lines;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManagerDecideSellRequest {
        @NotBlank(message = "Decision action is required (APPROVE or REJECT)")
        private String decisionAction; // APPROVE or REJECT

        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SellLineResponse {
        private UUID sellLineId;
        private UUID itemId;
        private String itemTitle;
        private String isbnOrCode;
        private boolean authenticityVerified;
        private String assessedCondition;
        private BigDecimal baseItemValue;
        private BigDecimal quotedAmount;
        private String decision;
        private String intendedListingType;
        private String rejectionOrDeclineReason;
        private UUID createdCopyId;
        private UUID createdListingId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SellSubmissionResponse {
        private UUID submissionId;
        private String submissionNumber;
        private UUID sellerUserId;
        private String sellerName;
        private String sellerEmail;
        private UUID storeId;
        private String storeName;
        private String status;
        private BigDecimal totalQuotedAmount;
        private BigDecimal totalApprovedPayout;
        private String visitNotes;
        private Instant decidedAt;
        private List<SellLineResponse> lines;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManagerOverviewItem {
        private String id;
        private String referenceId;
        private String title;
        private String meta;
        private String value;
        private String status;
        private String tone; // neutral, info, success, warning, danger
        private String secondary;
        private String type; // order, borrow, return, sell, inventory, listing, report
        private String pickupOtp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManagerOverviewResponse {
        private UUID storeId;
        private String storeName;
        private String storeCode;
        private String institutionName;
        private BigDecimal todaysSales;
        private long openOrdersCount;
        private long readyForPickupCount;
        private long activeBorrowingsCount;
        private long overdueBorrowingsCount;
        private long toInspectCount;
        private int fulfillmentRate;
        private int pickupOnTimeRate;
        private int inspectionSlaRate;
        private List<ManagerOverviewItem> rows;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManagerPageStat {
        private String label;
        private String value;
        private String change;
        private String tone; // neutral, info, success, warning, danger
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManagerPageResponse {
        private String page;
        private String title;
        private String description;
        private List<ManagerPageStat> stats;
        private List<ManagerOverviewItem> rows;
    }
}
