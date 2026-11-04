package com.unikart.borrow;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FineRepository extends JpaRepository<Fine, UUID> {
    List<Fine> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);
    List<Fine> findByStore_StoreIdOrderByCreatedAtDesc(UUID storeId);
    List<Fine> findByBorrowRecord_BorrowId(UUID borrowId);
}
