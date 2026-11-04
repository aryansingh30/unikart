package com.unikart.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class OrderDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoreFulfilmentChoice {
        private String storeId;
        private String fulfilmentType;
        private String type;
        private String deliveryAddress;
        private String address;

        public StoreFulfilmentChoice(UUID storeId, String fulfilmentType, String deliveryAddress) {
            this.storeId = storeId != null ? storeId.toString() : null;
            this.fulfilmentType = fulfilmentType;
            this.deliveryAddress = deliveryAddress;
        }

        public StoreFulfilmentChoice(UUID storeId, String fulfilmentType) {
            this(storeId, fulfilmentType, null);
        }

        public void setStoreId(UUID storeId) {
            this.storeId = storeId != null ? storeId.toString() : null;
        }

        public void setStoreId(String storeId) {
            this.storeId = storeId;
        }

        public UUID getResolvedStoreId() {
            if (storeId == null || storeId.isBlank()) {
                return UUID.fromString("b0000000-0000-0000-0000-000000000001");
            }
            try {
                return UUID.fromString(storeId.trim());
            } catch (Exception e) {
                String clean = storeId.toLowerCase().trim();
                if (clean.contains("allduniv") || clean.contains("uoa") || clean.contains("au")) {
                    return UUID.fromString("b0000000-0000-0000-0000-000000000003");
                }
                if (clean.contains("iiita") || clean.contains("iiit")) {
                    return UUID.fromString("b0000000-0000-0000-0000-000000000002");
                }
                if (clean.contains("mnnit")) {
                    return UUID.fromString("b0000000-0000-0000-0000-000000000001");
                }
                return UUID.fromString("b0000000-0000-0000-0000-000000000001");
            }
        }

        public String getResolvedFulfilmentType() {
            String val = fulfilmentType != null ? fulfilmentType : type;
            if (val == null || val.isBlank()) return "SELF_PICKUP";
            if (val.toUpperCase().contains("DELIVERY")) return "DELIVERY";
            return "SELF_PICKUP";
        }

        public static class StoreFulfilmentChoiceBuilder {
            public StoreFulfilmentChoiceBuilder storeId(UUID storeId) {
                this.storeId = storeId != null ? storeId.toString() : null;
                return this;
            }

            public StoreFulfilmentChoiceBuilder storeId(String storeId) {
                this.storeId = storeId;
                return this;
            }
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitCheckoutRequest {
        private String idempotencyKey;
        private List<StoreFulfilmentChoice> storeFulfilments;
        private List<StoreFulfilmentChoice> fulfilmentChoices;
        private List<Map<String, Object>> items;
        @Builder.Default
        private BigDecimal walletAmountToUse = BigDecimal.ZERO;
        private BigDecimal walletAmount;
        private String paymentMethod;
        @Builder.Default
        private boolean confirmRevisedTotalIfPartialUnavailable = true;

        public String getEffectiveIdempotencyKey() {
            return (idempotencyKey != null && !idempotencyKey.isBlank())
                    ? idempotencyKey.trim()
                    : "CHK-" + System.currentTimeMillis();
        }

        public List<StoreFulfilmentChoice> getEffectiveStoreFulfilments() {
            if (storeFulfilments != null && !storeFulfilments.isEmpty()) return storeFulfilments;
            if (fulfilmentChoices != null && !fulfilmentChoices.isEmpty()) return fulfilmentChoices;
            return List.of(new StoreFulfilmentChoice("b0000000-0000-0000-0000-000000000001", "SELF_PICKUP", "SELF_PICKUP", null, null));
        }

        public BigDecimal getEffectiveWalletAmount() {
            if (walletAmountToUse != null && walletAmountToUse.compareTo(BigDecimal.ZERO) > 0) return walletAmountToUse;
            if (walletAmount != null) return walletAmount;
            return BigDecimal.ZERO;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentWebhookRequest {
        @NotBlank(message = "eventId is required")
        private String eventId;

        @NotNull(message = "checkoutId is required")
        private UUID checkoutId;

        @NotBlank(message = "status is required (SUCCESS or FAILED)")
        private String status;

        @NotBlank(message = "signature is required")
        private String signature;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HandoverVerifyRequest {
        @NotBlank(message = "OTP code is required (FUL-01 / FUL-09)")
        private String otpCode;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryWebhookRequest {
        @NotBlank(message = "eventId is required")
        private String eventId;

        @NotNull(message = "jobId is required")
        private UUID jobId;

        @NotBlank(message = "status is required (PICKED_UP, IN_TRANSIT, DELIVERED, FAILED)")
        private String status;

        private String failureReason;
        private String deliveryOtpCode;
        private String signature;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CancelStoreOrderRequest {
        private String idempotencyKey;
        private String reason;

        public String getEffectiveIdempotencyKey() {
            return (idempotencyKey != null && !idempotencyKey.isBlank())
                    ? idempotencyKey.trim()
                    : "IDEMP-CANCEL-" + UUID.randomUUID();
        }

        public String getEffectiveReason() {
            return (reason != null && !reason.isBlank())
                    ? reason.trim()
                    : "Customer requested cancellation";
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderLineResponse {
        private UUID orderLineId;
        private UUID listingId;
        private UUID itemId;
        private String itemTitle;
        private String isbnOrCode;
        private String category;
        private UUID allocatedCopyId;
        private String allocatedCopyCode;
        private String lineType;
        private String borrowDuration;
        private BigDecimal unitItemValue;
        private BigDecimal lineAmount;
        private BigDecimal depositAmount;
        private BigDecimal totalLineAmount;
        private String status;
        private UUID borrowRecordId;
        private String borrowNumber;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoreOrderResponse {
        private UUID storeOrderId;
        private String orderNumber;
        private UUID checkoutId;
        private UUID storeId;
        private String storeCode;
        private String storeName;
        private String institutionName;
        private boolean isCrossInstitution;
        private String fulfilmentType;
        private String status;
        private String deliveryAddress;
        private String pickupOtpCode;
        private String deliveryOtpCode;
        private Instant pickupReadyAt;
        private Instant pickupDeadlineAt;
        private Instant handedOverAt;
        private BigDecimal subtotalAmount;
        private BigDecimal depositAmount;
        private BigDecimal deliveryCharge;
        private BigDecimal incurredDeliveryCharge;
        private BigDecimal totalAmount;
        private BigDecimal walletAllocatedAmount;
        private BigDecimal gatewayAllocatedAmount;
        private String deliveryTrackingRef;
        private String deliveryJobStatus;
        private int deliveryAttemptCount;
        private List<OrderLineResponse> lines;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckoutResponse {
        private UUID checkoutId;
        private String checkoutNumber;
        private String idempotencyKey;
        private String status;
        private BigDecimal subtotalAmount;
        private BigDecimal totalDepositAmount;
        private BigDecimal totalDeliveryAmount;
        private BigDecimal grandTotalAmount;
        private BigDecimal walletPaidAmount;
        private BigDecimal gatewayPaidAmount;
        private boolean revisedTotalConfirmed;
        private List<String> unavailableLineNotices;
        private List<StoreOrderResponse> storeOrders;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RefundResponse {
        private UUID refundId;
        private UUID storeOrderId;
        private String orderNumber;
        private String refundType;
        private BigDecimal grossRefundableAmount;
        private BigDecimal deductedCharges;
        private BigDecimal netRefundAmount;
        private BigDecimal walletRefundShare;
        private BigDecimal gatewayRefundShare;
        private String reason;
        private String status;
        private Instant createdAt;
    }
}
