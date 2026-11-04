package com.unikart.order;

import com.unikart.auth.User;
import com.unikart.institution.Store;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "store_orders")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "store_order_id")
    private UUID storeOrderId;

    @Column(name = "order_number", nullable = false, unique = true, length = 40)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checkout_id", nullable = false)
    private Checkout checkout;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "is_cross_institution", nullable = false)
    @Builder.Default
    private boolean crossInstitution = false;

    @Column(name = "fulfilment_type", nullable = false, length = 20)
    private String fulfilmentType; // SELF_PICKUP, DELIVERY

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PAYMENT_PENDING";
    // PAYMENT_PENDING, CONFIRMED, PREPARING, READY_FOR_PICKUP, DISPATCHED, HANDED_OVER, COMPLETED, DELIVERY_FAILED, CANCELLED

    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "pickup_otp_code", length = 10)
    private String pickupOtpCode;

    @Column(name = "delivery_otp_code", length = 10)
    private String deliveryOtpCode;

    @Column(name = "pickup_ready_at")
    private Instant pickupReadyAt;

    @Column(name = "pickup_deadline_at")
    private Instant pickupDeadlineAt;

    @Column(name = "handed_over_at")
    private Instant handedOverAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handed_over_by")
    private User handedOverBy;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "subtotal_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal subtotalAmount = BigDecimal.ZERO;

    @Column(name = "deposit_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal depositAmount = BigDecimal.ZERO;

    @Column(name = "delivery_charge", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal deliveryCharge = BigDecimal.ZERO;

    @Column(name = "incurred_delivery_charge", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal incurredDeliveryCharge = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_snapshot", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private String configSnapshot = "{}";

    @OneToMany(mappedBy = "storeOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderLine> lines = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
