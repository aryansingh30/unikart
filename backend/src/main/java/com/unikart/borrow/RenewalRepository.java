package com.unikart.borrow;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RenewalRepository extends JpaRepository<Renewal, UUID> {
    Optional<Renewal> findByBorrowRecord_BorrowId(UUID borrowId);
}
