package com.unikart.order;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PaymentAllocationRepository extends JpaRepository<PaymentAllocation, UUID> {
    List<PaymentAllocation> findByStoreOrder_StoreOrderId(UUID storeOrderId);
    List<PaymentAllocation> findByPayment_PaymentId(UUID paymentId);
}
