package com.unikart.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WaitlistEntryRepository extends JpaRepository<WaitlistEntry, UUID> {

    Optional<WaitlistEntry> findByUser_UserIdAndItem_ItemIdAndStore_StoreIdAndStatusIn(
            UUID userId, UUID itemId, UUID storeId, List<String> statuses);

    List<WaitlistEntry> findByItem_ItemIdAndStore_StoreIdAndStatusOrderByCreatedAtAsc(
            UUID itemId, UUID storeId, String status);

    boolean existsByItem_ItemIdAndStore_StoreIdAndStatusIn(
            UUID itemId, UUID storeId, List<String> statuses);

    List<WaitlistEntry> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);
}
