package com.unikart.borrow;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DueRepository extends JpaRepository<Due, UUID> {
    List<Due> findByUser_UserIdAndStatus(UUID userId, String status);
    Optional<Due> findByFine_FineId(UUID fineId);
}
