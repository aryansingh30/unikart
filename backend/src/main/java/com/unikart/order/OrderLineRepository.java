package com.unikart.order;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OrderLineRepository extends JpaRepository<OrderLine, UUID> {
    List<OrderLine> findByStoreOrder_StoreOrderIdOrderByCreatedAtAsc(UUID storeOrderId);
}
