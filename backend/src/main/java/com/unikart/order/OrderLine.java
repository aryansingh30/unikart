package com.unikart.order;

import com.unikart.catalog.Copy;
import com.unikart.catalog.Item;
import com.unikart.catalog.Listing;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_lines")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderLine {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "order_line_id")
    private UUID orderLineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_order_id", nullable = false)
    private StoreOrder storeOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    private Listing listing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocated_copy_id")
    private Copy allocatedCopy;

    @Column(name = "line_type", nullable = false, length = 15)
    private String lineType; // PURCHASE, BORROW

    @Column(name = "borrow_duration", length = 15)
    private String borrowDuration; // DAYS_14, DAYS_30, DAYS_45

    @Column(name = "unit_item_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitItemValue;

    @Column(name = "line_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineAmount;

    @Column(name = "deposit_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal depositAmount = BigDecimal.ZERO;

    @Column(name = "total_line_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalLineAmount;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING_ALLOCATION";
    // PENDING_ALLOCATION, ALLOCATED, UNAVAILABLE_REFUNDED, HANDED_OVER, COMPLETED, CANCELLED

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
