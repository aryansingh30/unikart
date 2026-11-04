package com.unikart.catalog;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class CatalogDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateItemRequest {
        @NotBlank(message = "Title is required")
        private String title;

        @NotBlank(message = "Author is required")
        private String author;

        @NotBlank(message = "ISBN or code is required")
        private String isbnOrCode;

        @NotBlank(message = "Category is required (BOOK, NOTES, STUDY_MATERIAL)")
        private String category;

        @NotBlank(message = "Subject is required")
        private String subject;

        @NotBlank(message = "Course code is required")
        private String courseCode;

        private String semester;
        private String publisher;
        private String edition;
        private Integer publicationYear;
        private String description;
        private String coverImageUrl;

        @NotNull(message = "Base value is required")
        @DecimalMin(value = "0.0", inclusive = true)
        private BigDecimal baseValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateCopyRequest {
        @NotNull(message = "Item ID is required")
        private UUID itemId;

        @NotBlank(message = "Copy code / barcode is required")
        private String copyCode;

        @NotBlank(message = "Condition is required (NEW, GOOD, FAIR, DAMAGED)")
        private String condition;

        @Builder.Default
        private boolean allowedForSale = true;

        @Builder.Default
        private boolean allowedForBorrow = true;

        @Builder.Default
        private String acquisitionSource = "STORE_PROCUREMENT";

        private String conditionNotes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateCopyStatusRequest {
        @NotBlank(message = "Condition is required")
        private String condition;

        @NotBlank(message = "Status is required")
        private String status;

        private boolean allowedForSale;
        private boolean allowedForBorrow;
        private String conditionNotes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateListingRequest {
        @NotNull(message = "Item ID is required")
        private UUID itemId;

        @NotBlank(message = "Listing type is required (BUY_ONLY, BORROW_ONLY, BUY_AND_BORROW)")
        private String listingType;

        @NotNull(message = "Sale price is required")
        @DecimalMin(value = "0.0", inclusive = true)
        private BigDecimal salePrice;

        @NotNull(message = "Base item value is required")
        @DecimalMin(value = "0.0", inclusive = true)
        private BigDecimal baseItemValue;

        @Builder.Default
        private BigDecimal borrowFeePct14d = new BigDecimal("10.00");

        @Builder.Default
        private BigDecimal borrowFeePct30d = new BigDecimal("18.00");

        @Builder.Default
        private BigDecimal borrowFeePct45d = new BigDecimal("25.00");

        @Builder.Default
        private BigDecimal depositPct = new BigDecimal("50.00");

        @Builder.Default
        private int lowStockThreshold = 2;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListingResponse {
        private UUID listingId;
        private UUID itemId;
        private String title;
        private String author;
        private String isbnOrCode;
        private String category;
        private String subject;
        private String courseCode;
        private String semester;
        private String publisher;
        private String edition;
        private Integer publicationYear;
        private String description;
        private String coverImageUrl;
        private UUID storeId;
        private String storeCode;
        private String storeName;
        private UUID institutionId;
        private String institutionCode;
        private String institutionName;
        private String listingType;
        private BigDecimal salePrice;
        private BigDecimal baseItemValue;
        private BigDecimal borrowFee14d;
        private BigDecimal borrowFee30d;
        private BigDecimal borrowFee45d;
        private BigDecimal depositAmount;
        private long availableForSaleCount;
        private long availableForBorrowCount;
        private long totalAvailableCopies;
        private String bestAvailableCondition;
        private List<String> availableConditions;
        private boolean lowStock;
        private boolean selfPickupAllowedForViewer;
        private List<String> allowedFulfilmentOptions;
        private String status;
        private Double averageRating;
        private Integer reviewsCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CopyResponse {
        private UUID copyId;
        private String copyCode;
        private UUID itemId;
        private String itemTitle;
        private String isbnOrCode;
        private UUID storeId;
        private String storeCode;
        private String condition;
        private String status;
        private boolean allowedForSale;
        private boolean allowedForBorrow;
        private String acquisitionSource;
        private String conditionNotes;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateItemForSaleRequest {
        @NotBlank(message = "Title is required")
        private String title;

        @NotBlank(message = "Author is required")
        private String author;

        private String isbnOrCode;
        private String category;
        private String condition;

        @NotNull(message = "Sale price is required")
        @DecimalMin(value = "0.0", inclusive = true)
        private BigDecimal salePrice;

        private BigDecimal baseItemValue;
        private String listingType;
        private Integer initialStock;
        private String coverImageUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WaitlistResponse {
        private UUID waitlistId;
        private UUID itemId;
        private String itemTitle;
        private UUID storeId;
        private String storeName;
        private String status;
        private Instant createdAt;
        private Instant notifiedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewDto {
        private UUID reviewId;
        private UUID itemId;
        private UUID userId;
        private String reviewerName;
        private String institutionCode;
        private int rating;
        private String reviewText;
        private boolean verifiedBuyer;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewSummaryResponse {
        private UUID itemId;
        private double averageRating;
        private int totalReviews;
        private Map<Integer, Long> ratingBreakdown;
        private List<ReviewDto> reviews;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitReviewRequest {
        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be between 1 and 5")
        @Max(value = 5, message = "Rating must be between 1 and 5")
        private Integer rating;

        private String reviewText;
    }
}
