package com.unikart.borrow;

import com.unikart.auth.User;
import com.unikart.catalog.Copy;
import com.unikart.catalog.Item;
import com.unikart.institution.Store;
import com.unikart.order.OrderLine;
import com.unikart.order.StoreOrder;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "borrow_records")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BorrowRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "borrow_id")
    private UUID borrowId;

    @Column(name = "borrow_number", nullable = false, unique = true, length = 40)
    private String borrowNumber;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_line_id", nullable = false, unique = true)
    private OrderLine orderLine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_order_id", nullable = false)
    private StoreOrder storeOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "copy_id", nullable = false)
    private Copy copy;

    @Column(nullable = false, length = 15)
    private String duration; // DAYS_14, DAYS_30, DAYS_45

    @Column(name = "duration_days", nullable = false)
    private int durationDays; // 14, 30, 45

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "CONFIRMED";
    // PAYMENT_PENDING, CONFIRMED, READY_FOR_PICKUP, DISPATCHED, ACTIVE, RENEWED, OVERDUE, RETURN_INITIATED, INSPECTION, CLOSED, CLOSED_WITH_FINE, CANCELLED

    @Column(name = "borrow_fee_paid", nullable = false, precision = 12, scale = 2)
    private BigDecimal borrowFeePaid;

    @Column(name = "deposit_held", nullable = false, precision = 12, scale = 2)
    private BigDecimal depositHeld;

    @Column(name = "deposit_deducted", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal depositDeducted = BigDecimal.ZERO;

    @Column(name = "deposit_refunded", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal depositRefunded = BigDecimal.ZERO;

    @Column(name = "handover_at")
    private Instant handoverAt;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "renewed_count", nullable = false)
    @Builder.Default
    private int renewedCount = 0;

    @Column(name = "return_route", length = 25)
    private String returnRoute; // STORE_COUNTER, PARTNER_PICKUP

    @Column(name = "return_initiated_at")
    private Instant returnInitiatedAt;

    @Column(name = "received_at_store_at")
    private Instant receivedAtStoreAt;

    @Column(name = "inspected_at")
    private Instant inspectedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspected_by")
    private User inspectedBy;

    @Column(name = "return_condition", length = 20)
    private String returnCondition;

    @Column(name = "inspection_notes", columnDefinition = "TEXT")
    private String inspectionNotes;

    @Column(name = "closed_at")
    private Instant closedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config_snapshot", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private String configSnapshot = "{}";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
