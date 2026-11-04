package com.unikart.admin;

import com.unikart.auth.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "config_parameters")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfigParameter {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "parameter_id")
    private UUID parameterId;

    @Column(name = "param_key", nullable = false, length = 80)
    private String paramKey;

    @Column(name = "param_value", nullable = false, length = 255)
    private String paramValue;

    @Column(name = "value_type", nullable = false, length = 20)
    private String valueType; // DECIMAL, INTEGER, STRING, BOOLEAN, JSON

    @Column(nullable = false, length = 40)
    private String category; // BORROW, FINES, DELIVERY, REMINDERS, WALLET

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private int version;

    @Column(name = "effective_from", nullable = false)
    @Builder.Default
    private Instant effectiveFrom = Instant.now();

    @Column(name = "effective_to")
    private Instant effectiveTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Column(name = "change_reason", columnDefinition = "TEXT")
    private String changeReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
