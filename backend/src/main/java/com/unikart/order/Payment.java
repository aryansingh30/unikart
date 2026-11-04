package com.unikart.order;

import com.unikart.auth.User;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "payment_id")
    private UUID paymentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checkout_id")
    private Checkout checkout;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "payment_purpose", nullable = false, length = 30)
    @Builder.Default
    private String paymentPurpose = "CHECKOUT";
    // CHECKOUT, BORROW_RENEWAL, DUE_SETTLEMENT, RETURN_PICKUP_FEE

    @Column(name = "reference_entity_id")
    private UUID referenceEntityId;

    @Column(nullable = false, length = 20)
    private String method; // WALLET, GATEWAY

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "provider_reference", length = 120)
    private String providerReference;

    @Column(name = "provider_event_id", unique = true, length = 120)
    private String providerEventId;

    @Column(name = "provider_signature", length = 255)
    private String providerSignature;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
