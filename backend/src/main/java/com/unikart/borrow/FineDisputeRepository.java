package com.unikart.borrow;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FineDisputeRepository extends JpaRepository<FineDispute, UUID> {
    Optional<FineDispute> findByFine_FineId(UUID fineId);
    List<FineDispute> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);
    List<FineDispute> findByStore_StoreIdOrderByCreatedAtDesc(UUID storeId);
}
