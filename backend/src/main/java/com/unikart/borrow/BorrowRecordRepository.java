package com.unikart.borrow;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BorrowRecordRepository extends JpaRepository<BorrowRecord, UUID> {
    Optional<BorrowRecord> findByOrderLine_OrderLineId(UUID orderLineId);
    Optional<BorrowRecord> findByBorrowNumber(String borrowNumber);
    List<BorrowRecord> findByStoreOrder_StoreOrderId(UUID storeOrderId);
    List<BorrowRecord> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);
    List<BorrowRecord> findByStore_StoreIdOrderByCreatedAtDesc(UUID storeId);
    long countByUser_UserIdAndStatusIn(UUID userId, List<String> statuses);
    List<BorrowRecord> findByStatusIn(List<String> statuses);
}
