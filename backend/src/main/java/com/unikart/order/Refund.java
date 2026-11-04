package com.unikart.order;

import com.unikart.auth.User;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refunds")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Refund {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "refund_id")
    private UUID refundId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_order_id", nullable = false)
    private StoreOrder storeOrder;

    @Column(name = "borrow_id")
    private UUID borrowId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "refund_type", nullable = false, length = 35)
    private String refundType;
    // ORDER_CANCELLATION, UNAVAILABLE_LINE_REFUND, PICKUP_NO_SHOW_SETTLEMENT, DELIVERY_FAILURE_SETTLEMENT, BORROW_DEPOSIT_SETTLEMENT

    @Column(name = "gross_refundable_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal grossRefundableAmount;

    @Column(name = "deducted_charges", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal deductedCharges = BigDecimal.ZERO;

    @Column(name = "net_refund_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal netRefundAmount;

    @Column(name = "wallet_refund_share", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal walletRefundShare = BigDecimal.ZERO;

    @Column(name = "gateway_refund_share", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal gatewayRefundShare = BigDecimal.ZERO;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "COMPLETED"; // PENDING, COMPLETED, FAILED

    @Column(name = "provider_refund_ref", length = 120)
    private String providerRefundRef;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;
}
