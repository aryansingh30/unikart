package com.unikart.catalog;

import com.unikart.auth.User;
import com.unikart.institution.Store;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "listings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Listing {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "listing_id")
    private UUID listingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "listing_type", nullable = false, length = 20)
    private String listingType; // BUY_ONLY, BORROW_ONLY, BUY_AND_BORROW

    @Column(name = "sale_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "base_item_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseItemValue;

    @Column(name = "borrow_fee_pct_14d", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal borrowFeePct14d = new BigDecimal("10.00");

    @Column(name = "borrow_fee_pct_30d", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal borrowFeePct30d = new BigDecimal("18.00");

    @Column(name = "borrow_fee_pct_45d", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal borrowFeePct45d = new BigDecimal("25.00");

    @Column(name = "deposit_pct", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal depositPct = new BigDecimal("50.00");

    @Column(name = "low_stock_threshold", nullable = false)
    @Builder.Default
    private int lowStockThreshold = 2;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE"; // DRAFT, ACTIVE, PAUSED, ARCHIVED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
