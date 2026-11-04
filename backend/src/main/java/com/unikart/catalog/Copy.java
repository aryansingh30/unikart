package com.unikart.catalog;

import com.unikart.institution.Store;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "copies")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Copy {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "copy_id")
    private UUID copyId;

    @Column(name = "copy_code", nullable = false, unique = true, length = 64)
    private String copyCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(nullable = false, length = 20)
    private String condition; // NEW, GOOD, FAIR, DAMAGED

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "AVAILABLE";
    // AVAILABLE, ALLOCATED, READY_FOR_PICKUP, DISPATCHED, BORROWED, SOLD, UNDER_INSPECTION, LOST, WITHDRAWN

    @Column(name = "allowed_for_sale", nullable = false)
    @Builder.Default
    private boolean allowedForSale = true;

    @Column(name = "allowed_for_borrow", nullable = false)
    @Builder.Default
    private boolean allowedForBorrow = true;

    @Column(name = "acquisition_source", nullable = false, length = 30)
    @Builder.Default
    private String acquisitionSource = "STORE_PROCUREMENT";
    // STORE_PROCUREMENT, CUSTOMER_SELL, INSTITUTION_SUPPLY

    @Column(name = "source_sell_line_id")
    private UUID sourceSellLineId;

    @Column(name = "condition_notes", columnDefinition = "TEXT")
    private String conditionNotes;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
