package com.unikart.wallet;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BankAccountRepository extends JpaRepository<BankAccount, UUID> {
    List<BankAccount> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);
}
