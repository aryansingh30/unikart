package com.unikart.wallet;

import com.unikart.auth.User;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wallet_transactions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tx_id")
    private UUID txId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    @Column(name = "tx_type", nullable = false, length = 35)
    private String txType;
    // SELLER_PAYOUT_CREDIT, REFUND_CREDIT, PURCHASE_DEBIT, BORROW_PAYMENT_DEBIT, RENEWAL_DEBIT, FINE_DUE_DEBIT, BANK_REDEMPTION_DEBIT, REVERSAL_CREDIT, REVERSAL_DEBIT

    @Column(nullable = false, length = 10)
    private String direction; // CREDIT, DEBIT

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String state = "SUCCESS"; // PENDING, SUCCESS, FAILED, REVERSED

    @Column(name = "balance_after", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceAfter;

    @Column(name = "reserved_after", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal reservedAfter = BigDecimal.ZERO;

    @Column(name = "reference_type", nullable = false, length = 40)
    private String referenceType;

    @Column(name = "reference_id", nullable = false, length = 100)
    private String referenceId;

    @Column(name = "reversal_of_tx_id")
    private UUID reversalOfTxId;

    @Column(name = "bank_account_id")
    private UUID bankAccountId;

    @Column(name = "provider_payout_ref", length = 120)
    private String providerPayoutRef;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
