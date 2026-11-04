package com.unikart.security;

import com.unikart.admin.AuditLog;
import com.unikart.admin.AuditLogRepository;
import com.unikart.admin.AuditService;
import com.unikart.auth.User;
import com.unikart.auth.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SecurityAndAuditHardeningTest {

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuditService auditService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    @DisplayName("NFR-04: Password encoding uses robust BCrypt adaptive hashing with verification")
    void passwordEncodingAndVerification() {
        String rawPassword = "SecurePassword@2026";
        String encoded = passwordEncoder.encode(rawPassword);

        assertThat(encoded).startsWith("$2a$");
        assertThat(passwordEncoder.matches(rawPassword, encoded)).isTrue();
        assertThat(passwordEncoder.matches("WrongPassword", encoded)).isFalse();
    }

    @Test
    @DisplayName("NFR-09 & ADM-06: Tamper-evident audit log creates cryptographic hash chain")
    void tamperEvidentAuditLogChain() {
        AuditLog log1 = auditService.recordAudit(null, "CREATE", "CONFIG", "PARAM-1", null, null, "v1", "Initial setup", "127.0.0.1", "CORR-01");
        AuditLog log2 = auditService.recordAudit(null, "UPDATE", "CONFIG", "PARAM-1", null, "v1", "v2", "Rate change", "127.0.0.1", "CORR-02");

        assertThat(log1.getPreviousHash()).isNotNull();
        assertThat(log1.getEntryHash()).isNotNull();
        assertThat(log2.getPreviousHash()).isEqualTo(log1.getEntryHash());
        assertThat(log2.getEntryHash()).isNotEqualTo(log1.getEntryHash());
    }
}
