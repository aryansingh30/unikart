package com.unikart.wallet;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {
    Optional<WalletTransaction> findByIdempotencyKey(String idempotencyKey);
    List<WalletTransaction> findByWallet_WalletIdOrderByCreatedAtDesc(UUID walletId);
    List<WalletTransaction> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);
}
