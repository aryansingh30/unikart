package com.unikart.cart;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class CartDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddCartLineRequest {
        @NotNull(message = "Listing ID is required")
        private UUID listingId;

        @NotBlank(message = "Line type is required (PURCHASE or BORROW)")
        private String lineType;

        private String borrowDuration; // DAYS_14, DAYS_30, DAYS_45 (Required when lineType = BORROW)

        @Min(value = 1, message = "Quantity must be at least 1")
        @Builder.Default
        private int quantity = 1;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateCartLineRequest {
        private String borrowDuration;

        @Min(value = 1, message = "Quantity must be at least 1")
        private int quantity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartLineView {
        private UUID cartLineId;
        private UUID listingId;
        private UUID itemId;
        private String title;
        private String author;
        private String isbnOrCode;
        private String category;
        private String coverImageUrl;
        private UUID storeId;
        private String storeCode;
        private String storeName;
        private UUID institutionId;
        private String institutionName;
        private String lineType; // PURCHASE, BORROW
        private String borrowDuration; // DAYS_14, DAYS_30, DAYS_45
        private int quantity;
        private BigDecimal unitItemValue;
        private BigDecimal unitPriceOrFee;
        private BigDecimal unitDeposit;
        private BigDecimal lineSubtotal;
        private BigDecimal lineDepositTotal;
        private BigDecimal lineTotal;
        private long currentAvailableCopies;
        private boolean currentlyAvailable;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoreCartGroupView {
        private UUID storeId;
        private String storeCode;
        private String storeName;
        private UUID institutionId;
        private String institutionCode;
        private String institutionName;
        private boolean isCrossInstitution;
        private boolean selfPickupAllowed;
        private List<String> allowedFulfilmentMethods; // SELF_PICKUP, DELIVERY
        private String defaultFulfilmentMethod;
        private BigDecimal estimatedDeliveryFee;
        private BigDecimal storeItemsSubtotal;
        private BigDecimal storeDepositsTotal;
        private List<CartLineView> lines;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartResponse {
        private UUID cartId;
        private UUID userId;
        private String status;
        private int totalLinesCount;
        private int totalUnitsCount;
        private List<StoreCartGroupView> storeGroups;
        private BigDecimal itemsSubtotal;
        private BigDecimal totalRefundableDeposit;
        private BigDecimal estimatedDeliveryTotal;
        private BigDecimal estimatedGrandTotal;
        private boolean hasUnavailableLines;
        private String reservationNotice;
    }
}
