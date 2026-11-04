package com.unikart.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CartRepository extends JpaRepository<Cart, UUID> {

    @Query("SELECT DISTINCT c FROM Cart c LEFT JOIN FETCH c.lines cl LEFT JOIN FETCH cl.listing l " +
           "LEFT JOIN FETCH l.item LEFT JOIN FETCH l.store s LEFT JOIN FETCH s.institution " +
           "WHERE c.user.userId = :userId AND c.status = 'ACTIVE'")
    Optional<Cart> findActiveCartWithLinesByUserId(@Param("userId") UUID userId);

    Optional<Cart> findByUser_UserIdAndStatus(UUID userId, String status);
}
