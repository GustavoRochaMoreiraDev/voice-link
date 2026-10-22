package com.voicelink.messages;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("SELECT m FROM Message m " +
           "JOIN FETCH m.sender " +
           "WHERE m.conversation.id = :conversationId " +
           "ORDER BY m.createdAt DESC")
    Page<Message> findByConversationIdOrderByCreatedAtDesc(
            @Param("conversationId") UUID conversationId, Pageable pageable);

    @Query("SELECT m FROM Message m " +
           "JOIN FETCH m.sender " +
           "WHERE m.conversation.id = :conversationId " +
           "ORDER BY m.createdAt DESC LIMIT 1")
    Optional<Message> findLatestMessage(@Param("conversationId") UUID conversationId);

    Optional<Message> findByConversationIdAndClientMessageId(UUID conversationId, String clientMessageId);
}
