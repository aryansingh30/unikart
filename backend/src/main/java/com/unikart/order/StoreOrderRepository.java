package com.unikart.order;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface StoreOrderRepository extends JpaRepository<StoreOrder, UUID> {
    List<StoreOrder> findByCheckout_CheckoutIdOrderByCreatedAtAsc(UUID checkoutId);
    List<StoreOrder> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);
    List<StoreOrder> findByStore_StoreIdOrderByCreatedAtDesc(UUID storeId);
    java.util.Optional<StoreOrder> findByOrderNumber(String orderNumber);
    List<StoreOrder> findByStatusAndPickupDeadlineAtBefore(String status, Instant deadline);
}
