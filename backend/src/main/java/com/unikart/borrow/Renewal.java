package com.unikart.borrow;

import com.unikart.auth.User;
import com.unikart.order.Payment;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "renewals")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Renewal {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "renewal_id")
    private UUID renewalId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrow_id", nullable = false, unique = true)
    private BorrowRecord borrowRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Column(name = "extension_days", nullable = false)
    private int extensionDays; // 14, 30, 45

    @Column(name = "renewal_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal renewalFee;

    @Column(name = "previous_due_at", nullable = false)
    private Instant previousDueAt;

    @Column(name = "new_due_at", nullable = false)
    private Instant newDueAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
