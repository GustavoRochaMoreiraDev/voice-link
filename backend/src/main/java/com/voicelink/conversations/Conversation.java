package com.voicelink.conversations;

import com.voicelink.users.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "conversations", uniqueConstraints = {
    @UniqueConstraint(name = "uq_conversation_participants", columnNames = {"participant1_id", "participant2_id"})
})
public class Conversation {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "type", nullable = false, length = 20)
    private String type = "DIRECT";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant1_id", nullable = false)
    private User participant1;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant2_id", nullable = false)
    private User participant2;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Conversation() {}

    public Conversation(UUID id, User p1, User p2) {
        this.id = id != null ? id : UUID.randomUUID();
        // Ensure consistent ordering to avoid duplicate pairs
        if (p1.getId().compareTo(p2.getId()) < 0) {
            this.participant1 = p1;
            this.participant2 = p2;
        } else {
            this.participant1 = p2;
            this.participant2 = p1;
        }
        this.type = "DIRECT";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public User getParticipant1() { return participant1; }
    public void setParticipant1(User participant1) { this.participant1 = participant1; }

    public User getParticipant2() { return participant2; }
    public void setParticipant2(User participant2) { this.participant2 = participant2; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public boolean hasParticipant(UUID userId) {
        return participant1.getId().equals(userId) || participant2.getId().equals(userId);
    }

    public User getOtherParticipant(UUID userId) {
        return participant1.getId().equals(userId) ? participant2 : participant1;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Conversation that = (Conversation) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
