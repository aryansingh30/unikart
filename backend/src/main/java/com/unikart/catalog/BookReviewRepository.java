package com.unikart.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookReviewRepository extends JpaRepository<BookReview, UUID> {

    List<BookReview> findByItem_ItemIdOrderByCreatedAtDesc(UUID itemId);

    long countByItem_ItemId(UUID itemId);

    @Query("SELECT AVG(CAST(r.rating AS double)) FROM BookReview r WHERE r.item.itemId = :itemId")
    Double getAverageRatingByItemId(@Param("itemId") UUID itemId);

    Optional<BookReview> findByUser_UserIdAndItem_ItemId(UUID userId, UUID itemId);
}
