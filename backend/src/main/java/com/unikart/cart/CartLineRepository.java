package com.unikart.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartLineRepository extends JpaRepository<CartLine, UUID> {
    List<CartLine> findByCart_CartIdOrderByCreatedAtAsc(UUID cartId);

    Optional<CartLine> findByCart_CartIdAndListing_ListingIdAndLineTypeAndBorrowDuration(
            UUID cartId, UUID listingId, String lineType, String borrowDuration);
}
