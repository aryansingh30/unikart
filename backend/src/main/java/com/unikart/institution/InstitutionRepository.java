package com.unikart.institution;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InstitutionRepository extends JpaRepository<Institution, UUID> {
    Optional<Institution> findByCodeIgnoreCase(String code);
    Optional<Institution> findByEmailDomainIgnoreCase(String emailDomain);
    List<Institution> findByStatusOrderByNameAsc(String status);
}
