package com.unikart.borrow;

import com.unikart.auth.User;
import com.unikart.institution.Store;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fines")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Fine {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "fine_id")
    private UUID fineId;

    @Column(name = "fine_number", nullable = false, unique = true, length = 40)
    private String fineNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrow_id", nullable = false)
    private BorrowRecord borrowRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "fine_type", nullable = false, length = 20)
    private String fineType; // LATE_RETURN, DAMAGE, LOSS

    @Column(name = "overdue_days", nullable = false)
    @Builder.Default
    private int overdueDays = 0;

    @Column(name = "daily_rate", precision = 12, scale = 2)
    private BigDecimal dailyRate;

    @Column(name = "assessed_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal assessedAmount;

    @Column(name = "adjusted_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal adjustedAmount;

    @Column(name = "deposit_deducted_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal depositDeductedAmount = BigDecimal.ZERO;

    @Column(name = "shortfall_due_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal shortfallDueAmount = BigDecimal.ZERO;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "evidence_notes", columnDefinition = "TEXT")
    private String evidenceNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessed_by")
    private User assessedBy;

    @Column(nullable = false, length = 25)
    @Builder.Default
    private String status = "ASSESSED";
    // ASSESSED, SETTLED_FROM_DEPOSIT, DUE_PENDING, DISPUTED, PAID, WAIVED

    @Column(name = "notified_at", nullable = false)
    @Builder.Default
    private Instant notifiedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
