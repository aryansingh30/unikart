package com.unikart.store;

import com.unikart.auth.User;
import com.unikart.catalog.Copy;
import com.unikart.catalog.Item;
import com.unikart.catalog.Listing;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sell_lines")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SellLine {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "sell_line_id")
    private UUID sellLineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private SellSubmission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "authenticity_verified", nullable = false)
    @Builder.Default
    private boolean authenticityVerified = true;

    @Column(name = "assessed_condition", nullable = false, length = 20)
    private String assessedCondition; // NEW, GOOD, FAIR, DAMAGED

    @Column(name = "base_item_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseItemValue;

    @Column(name = "quoted_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal quotedAmount = BigDecimal.ZERO;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String decision = "PENDING";
    // PENDING, QUOTED, ACCEPTED_AND_APPROVED, SELLER_DECLINED, REJECTED_BY_STORE

    @Column(name = "intended_listing_type", length = 20)
    @Builder.Default
    private String intendedListingType = "BUY_AND_BORROW";

    @Column(name = "rejection_or_decline_reason", columnDefinition = "TEXT")
    private String rejectionOrDeclineReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_copy_id")
    private Copy createdCopy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_listing_id")
    private Listing createdListing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
