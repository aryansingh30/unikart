package com.unikart.institution;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "authorised_user_entries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorisedUserEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "entry_id")
    private UUID entryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id", nullable = false)
    private Institution institution;

    @Column(name = "institutional_id", nullable = false, length = 64)
    private String institutionalId;

    @Column(nullable = false, length = 180)
    private String email;

    @Column(name = "full_name", nullable = false, length = 180)
    private String fullName;

    @Column(nullable = false, length = 30)
    private String designation; // STUDENT, PROFESSOR

    @Column(length = 120)
    private String department;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "is_registered", nullable = false)
    @Builder.Default
    private boolean registered = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
