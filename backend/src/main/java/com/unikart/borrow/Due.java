package com.unikart.borrow;

import com.unikart.auth.User;
import com.unikart.order.Payment;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "dues")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Due {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "due_id")
    private UUID dueId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fine_id", nullable = false, unique = true)
    private Fine fine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "original_shortfall", nullable = false, precision = 12, scale = 2)
    private BigDecimal originalShortfall;

    @Column(name = "outstanding_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal outstandingAmount;

    @Column(name = "is_disputed", nullable = false)
    @Builder.Default
    private boolean disputed = false;

    @Column(name = "blocks_borrowing", nullable = false)
    @Builder.Default
    private boolean blocksBorrowing = true;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "UNPAID"; // UNPAID, PAID, WAIVED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_payment_id")
    private Payment paidPayment;

    @Column(name = "settled_at")
    private Instant settledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
