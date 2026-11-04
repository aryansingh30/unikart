package com.unikart.order;

import com.unikart.auth.User;
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
@Table(name = "checkouts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Checkout {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "checkout_id")
    private UUID checkoutId;

    @Column(name = "checkout_number", nullable = false, unique = true, length = 40)
    private String checkoutNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(nullable = false, length = 35)
    @Builder.Default
    private String status = "PAYMENT_PENDING";
    // PAYMENT_PENDING, AWAITING_REVISED_CONFIRMATION, CONFIRMED, PARTIALLY_CANCELLED, COMPLETED, PAYMENT_FAILED, CANCELLED

    @Column(name = "subtotal_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal subtotalAmount = BigDecimal.ZERO;

    @Column(name = "total_deposit_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalDepositAmount = BigDecimal.ZERO;

    @Column(name = "total_delivery_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalDeliveryAmount = BigDecimal.ZERO;

    @Column(name = "grand_total_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal grandTotalAmount = BigDecimal.ZERO;

    @Column(name = "wallet_paid_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal walletPaidAmount = BigDecimal.ZERO;

    @Column(name = "gateway_paid_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal gatewayPaidAmount = BigDecimal.ZERO;

    @Column(name = "revised_total_confirmed", nullable = false)
    @Builder.Default
    private boolean revisedTotalConfirmed = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_snapshot", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private String configSnapshot = "{}";

    @OneToMany(mappedBy = "checkout", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StoreOrder> storeOrders = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
