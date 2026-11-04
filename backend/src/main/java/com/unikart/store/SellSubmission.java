package com.unikart.store;

import com.unikart.auth.User;
import com.unikart.institution.Store;
import com.unikart.wallet.WalletTransaction;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "sell_submissions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SellSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "submission_id")
    private UUID submissionId;

    @Column(name = "submission_number", nullable = false, unique = true, length = 40)
    private String submissionNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_user_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by_manager_id", nullable = false)
    private User verifiedByManager;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "INSPECTING";
    // INSPECTING, QUOTED, SELLER_ACCEPTED_APPROVED, SELLER_DECLINED, REJECTED

    @Column(name = "total_quoted_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalQuotedAmount = BigDecimal.ZERO;

    @Column(name = "total_approved_payout", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalApprovedPayout = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_tx_id")
    private WalletTransaction walletTransaction;

    @Column(name = "visit_notes", columnDefinition = "TEXT")
    private String visitNotes;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SellLine> lines = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
