package com.unikart.cart;

import com.unikart.catalog.Listing;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cart_lines")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartLine {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "cart_line_id")
    private UUID cartLineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    private Listing listing;

    @Column(name = "line_type", nullable = false, length = 15)
    private String lineType; // PURCHASE, BORROW

    @Column(name = "borrow_duration", length = 15)
    private String borrowDuration; // DAYS_14, DAYS_30, DAYS_45 (null for PURCHASE)

    @Column(nullable = false)
    @Builder.Default
    private int quantity = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
