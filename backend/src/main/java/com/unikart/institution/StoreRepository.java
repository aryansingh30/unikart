package com.unikart.institution;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreRepository extends JpaRepository<Store, UUID> {
    Optional<Store> findByInstitution_InstitutionIdAndStatus(UUID institutionId, String status);
    Optional<Store> findByStoreCodeIgnoreCase(String storeCode);
    List<Store> findByStatusOrderByNameAsc(String status);
}
