package com.unikart.catalog;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CopyRepository extends JpaRepository<Copy, UUID> {

    Optional<Copy> findByCopyCodeIgnoreCase(String copyCode);

    List<Copy> findByStore_StoreIdOrderByCreatedAtDesc(UUID storeId);

    List<Copy> findByItem_ItemIdAndStore_StoreId(UUID itemId, UUID storeId);

    // CAT-06 & INV-04: Derived availability count of eligible copies for sale
    @Query("SELECT COUNT(c) FROM Copy c WHERE c.item.itemId = :itemId AND c.store.storeId = :storeId " +
           "AND c.status = 'AVAILABLE' AND c.allowedForSale = true AND c.condition <> 'DAMAGED'")
    long countEligibleCopiesForSale(@Param("itemId") UUID itemId, @Param("storeId") UUID storeId);

    // CAT-06 & INV-04: Derived availability count of eligible copies for borrow
    @Query("SELECT COUNT(c) FROM Copy c WHERE c.item.itemId = :itemId AND c.store.storeId = :storeId " +
           "AND c.status = 'AVAILABLE' AND c.allowedForBorrow = true AND c.condition <> 'DAMAGED'")
    long countEligibleCopiesForBorrow(@Param("itemId") UUID itemId, @Param("storeId") UUID storeId);

    // Total AVAILABLE non-damaged copies for a given Item + Store
    @Query("SELECT c FROM Copy c WHERE c.item.itemId = :itemId AND c.store.storeId = :storeId " +
           "AND c.status = 'AVAILABLE' AND c.condition <> 'DAMAGED' ORDER BY c.createdAt ASC")
    List<Copy> findAvailableCopiesForListing(@Param("itemId") UUID itemId, @Param("storeId") UUID storeId);

    // INV-06 & CART-09: Pessimistic write lock for concurrency-safe atomic allocation at checkout
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Copy c WHERE c.item.itemId = :itemId AND c.store.storeId = :storeId " +
           "AND c.status = 'AVAILABLE' AND c.allowedForSale = true AND c.condition <> 'DAMAGED' ORDER BY c.createdAt ASC")
    List<Copy> findAndLockEligibleCopiesForSale(@Param("itemId") UUID itemId, @Param("storeId") UUID storeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Copy c WHERE c.item.itemId = :itemId AND c.store.storeId = :storeId " +
           "AND c.status = 'AVAILABLE' AND c.allowedForBorrow = true AND c.condition <> 'DAMAGED' ORDER BY c.createdAt ASC")
    List<Copy> findAndLockEligibleCopiesForBorrow(@Param("itemId") UUID itemId, @Param("storeId") UUID storeId);
}
