package com.unikart.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ListingRepository extends JpaRepository<Listing, UUID> {

    @Query("SELECT l FROM Listing l JOIN FETCH l.item i JOIN FETCH l.store s JOIN FETCH s.institution inst " +
           "WHERE l.status = 'ACTIVE' AND i.status = 'ACTIVE' AND s.status = 'ACTIVE'")
    List<Listing> findAllActiveWithItemAndStore();

    @Query("SELECT l FROM Listing l JOIN FETCH l.item i JOIN FETCH l.store s JOIN FETCH s.institution inst " +
           "WHERE l.listingId = :listingId")
    Optional<Listing> findByIdWithDetails(@Param("listingId") UUID listingId);

    List<Listing> findByStore_StoreIdOrderByCreatedAtDesc(UUID storeId);

    Optional<Listing> findByItem_ItemIdAndStore_StoreIdAndStatus(UUID itemId, UUID storeId, String status);
}
