package com.unikart.borrow;

import com.unikart.auth.User;
import com.unikart.institution.Store;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fine_disputes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FineDispute {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "dispute_id")
    private UUID disputeId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fine_id", nullable = false, unique = true)
    private Fine fine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "customer_reason", nullable = false, columnDefinition = "TEXT")
    private String customerReason;

    @Column(name = "disputed_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal disputedAmount;

    @Column(nullable = false, length = 25)
    @Builder.Default
    private String status = "SUBMITTED";
    // SUBMITTED, UNDER_REVIEW, UPHELD, ADJUSTED, WAIVED

    @Column(name = "manager_response", columnDefinition = "TEXT")
    private String managerResponse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_reviewed_by")
    private User managerReviewedBy;

    @Column(name = "manager_reviewed_at")
    private Instant managerReviewedAt;

    @Column(name = "manager_target_due_at", nullable = false)
    private Instant managerTargetDueAt;

    @Column(name = "escalated_to_admin", nullable = false)
    @Builder.Default
    private boolean escalatedToAdmin = false;

    @Column(name = "admin_resolution_notes", columnDefinition = "TEXT")
    private String adminResolutionNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_resolved_by")
    private User adminResolvedBy;

    @Column(name = "admin_resolved_at")
    private Instant adminResolvedAt;

    @Column(name = "admin_target_due_at")
    private Instant adminTargetDueAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
