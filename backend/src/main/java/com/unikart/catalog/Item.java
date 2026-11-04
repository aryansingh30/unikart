package com.unikart.catalog;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "item_id")
    private UUID itemId;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, length = 255)
    private String author;

    @Column(name = "isbn_or_code", nullable = false, unique = true, length = 64)
    private String isbnOrCode;

    @Column(nullable = false, length = 40)
    private String category; // BOOK, NOTES, STUDY_MATERIAL

    @Column(name = "format_type", nullable = false, length = 30)
    @Builder.Default
    private String formatType = "PHYSICAL"; // PHYSICAL, DIGITAL_FUTURE (NFR-15)

    @Column(nullable = false, length = 150)
    private String subject;

    @Column(name = "course_code", nullable = false, length = 64)
    private String courseCode;

    @Column(length = 32)
    private String semester;

    @Column(length = 180)
    private String publisher;

    @Column(length = 64)
    private String edition;

    @Column(name = "publication_year")
    private Integer publicationYear;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "base_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseValue;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
