package com.unikart.store;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SellSubmissionRepository extends JpaRepository<SellSubmission, UUID> {
    List<SellSubmission> findByStore_StoreIdOrderByCreatedAtDesc(UUID storeId);
    List<SellSubmission> findBySeller_UserIdOrderByCreatedAtDesc(UUID userId);
}
