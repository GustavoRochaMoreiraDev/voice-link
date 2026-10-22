package com.voicelink.conversations;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("SELECT c FROM Conversation c " +
           "JOIN FETCH c.participant1 " +
           "JOIN FETCH c.participant2 " +
           "WHERE (c.participant1.id = :userA AND c.participant2.id = :userB) " +
           "   OR (c.participant1.id = :userB AND c.participant2.id = :userA)")
    Optional<Conversation> findDirectConversation(@Param("userA") UUID userA, @Param("userB") UUID userB);

    @Query("SELECT c FROM Conversation c " +
           "JOIN FETCH c.participant1 " +
           "JOIN FETCH c.participant2 " +
           "WHERE c.participant1.id = :userId OR c.participant2.id = :userId " +
           "ORDER BY c.updatedAt DESC")
    List<Conversation> findUserConversations(@Param("userId") UUID userId);
}
