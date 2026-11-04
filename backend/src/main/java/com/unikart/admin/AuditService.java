package com.unikart.admin;

import com.unikart.auth.User;
import com.unikart.institution.Store;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public AuditLog recordAudit(
            User actor,
            String action,
            String entityType,
            String entityId,
            Store store,
            String beforeState,
            String afterState,
            String reason,
            String ipAddress,
            String correlationId) {

        String actorRole = actor != null ? actor.getRole() : "ANONYMOUS";
        
        // Retrieve last log for chain integrity (tamper-evident hash chain)
        List<AuditLog> recentLogs = auditLogRepository.findAllByOrderByCreatedAtDesc();
        String previousHash = recentLogs.isEmpty() ? "00000000000000000000000000000000" : recentLogs.get(0).getEntryHash();

        Instant now = Instant.now();
        String rawData = previousHash + "|" + (actor != null ? actor.getUserId().toString() : "SYSTEM") + "|" + action + "|" + entityType + "|" + entityId + "|" + now.toString();
        String entryHash = sha256(rawData);

        AuditLog log = AuditLog.builder()
                .actorUser(actor)
                .actorRole(actorRole)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .store(store)
                .beforeState(ensureValidJson(beforeState))
                .afterState(ensureValidJson(afterState))
                .reason(reason)
                .ipAddress(ipAddress)
                .correlationId(correlationId)
                .previousHash(previousHash)
                .entryHash(entryHash)
                .createdAt(now)
                .build();

        return auditLogRepository.save(log);
    }

    private String ensureValidJson(String state) {
        if (state == null) {
            return null;
        }
        String trimmed = state.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
            (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
            return trimmed;
        }
        return "{\"value\":\"" + trimmed.replace("\"", "\\\"") + "\"}";
    }

    private String sha256(String base) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
