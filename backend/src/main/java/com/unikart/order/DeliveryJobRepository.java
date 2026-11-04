package com.unikart.order;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryJobRepository extends JpaRepository<DeliveryJob, UUID> {
    Optional<DeliveryJob> findByIdempotencyKey(String idempotencyKey);
    Optional<DeliveryJob> findByStoreOrder_StoreOrderIdAndDirection(UUID storeOrderId, String direction);
    List<DeliveryJob> findByStore_StoreIdOrderByCreatedAtDesc(UUID storeId);
}
