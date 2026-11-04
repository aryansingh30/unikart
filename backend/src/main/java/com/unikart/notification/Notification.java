package com.unikart.notification;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.unikart.auth.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "notification_id")
    private UUID notificationId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public String getBody() {
        return this.message;
    }

    @Column(nullable = false, length = 15)
    private String channel; // IN_APP, EMAIL, SMS

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "is_mandatory", nullable = false)
    @Builder.Default
    private boolean mandatory = true;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "action_link", length = 255)
    private String actionLink;

    @Column(name = "delivery_state", nullable = false, length = 20)
    @Builder.Default
    private String deliveryState = "SENT"; // PENDING, SENT, FAILED, SKIPPED

    @Column(name = "failure_or_skip_reason", columnDefinition = "TEXT")
    private String failureOrSkipReason;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
