package com.unikart.order;

import com.unikart.auth.User;
import com.unikart.borrow.BorrowRecord;
import com.unikart.institution.Store;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_jobs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryJob {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "job_id")
    private UUID jobId;

    @Column(name = "job_number", nullable = false, unique = true, length = 40)
    private String jobNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_order_id")
    private StoreOrder storeOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrow_id")
    private BorrowRecord borrowRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String direction; // OUTBOUND, RETURN_PICKUP

    @Column(name = "is_cross_institution", nullable = false)
    @Builder.Default
    private boolean crossInstitution = false;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "provider_name", nullable = false, length = 80)
    @Builder.Default
    private String providerName = "Unikart Express Logistics";

    @Column(name = "provider_tracking_ref", nullable = false, unique = true, length = 80)
    private String providerTrackingRef;

    @Column(name = "pickup_address", nullable = false, columnDefinition = "TEXT")
    private String pickupAddress;

    @Column(name = "destination_address", nullable = false, columnDefinition = "TEXT")
    private String destinationAddress;

    @Column(name = "delivery_charge", nullable = false, precision = 12, scale = 2)
    private BigDecimal deliveryCharge;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ASSIGNED";
    // ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, FAILED_RETRY_SCHEDULED, FAILED_RETURNING_TO_STORE, RETURNED_TO_STORE, EXCEPTION

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "max_retries", nullable = false)
    @Builder.Default
    private int maxRetries = 2;

    @Column(name = "first_failed_at")
    private Instant firstFailedAt;

    @Column(name = "retry_window_expires_at")
    private Instant retryWindowExpiresAt;

    @Column(name = "last_failure_reason", columnDefinition = "TEXT")
    private String lastFailureReason;

    @Column(name = "handover_otp_verified", nullable = false)
    @Builder.Default
    private boolean handoverOtpVerified = false;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
