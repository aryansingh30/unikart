package com.unikart.institution;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthorisedUserEntryRepository extends JpaRepository<AuthorisedUserEntry, UUID> {
    Optional<AuthorisedUserEntry> findByInstitution_InstitutionIdAndInstitutionalIdIgnoreCaseAndEmailIgnoreCase(
            UUID institutionId, String institutionalId, String email);
    Optional<AuthorisedUserEntry> findByInstitution_InstitutionIdAndInstitutionalIdIgnoreCase(
            UUID institutionId, String institutionalId);
    List<AuthorisedUserEntry> findByInstitution_InstitutionIdOrderByCreatedAtDesc(UUID institutionId);
}
