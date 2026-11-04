package com.unikart.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface OtpTokenRepository extends JpaRepository<OtpToken, UUID> {
    Optional<OtpToken> findTopByUser_UserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(UUID userId, String purpose);
    void deleteByExpiresAtBefore(Instant now);
}
