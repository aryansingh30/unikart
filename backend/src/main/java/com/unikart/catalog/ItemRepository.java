package com.unikart.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface ItemRepository extends JpaRepository<Item, UUID> {

    @Query("SELECT i FROM Item i WHERE LOWER(i.isbnOrCode) = LOWER(:isbnOrCode)")
    Optional<Item> findByIsbnOrCodeIgnoreCase(@Param("isbnOrCode") String isbnOrCode);

    @Query("SELECT COUNT(i) > 0 FROM Item i WHERE LOWER(i.isbnOrCode) = LOWER(:isbnOrCode)")
    boolean existsByIsbnOrCodeIgnoreCase(@Param("isbnOrCode") String isbnOrCode);
}