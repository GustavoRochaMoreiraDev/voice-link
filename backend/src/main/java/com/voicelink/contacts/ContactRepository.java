package com.voicelink.contacts;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContactRepository extends JpaRepository<Contact, UUID> {

    @Query("SELECT c FROM Contact c " +
           "JOIN FETCH c.requester " +
           "JOIN FETCH c.recipient " +
           "WHERE (c.requester.id = :userId OR c.recipient.id = :userId) AND c.status = 'ACCEPTED'")
    List<Contact> findAcceptedContactsForUser(@Param("userId") UUID userId);

    @Query("SELECT c FROM Contact c " +
           "JOIN FETCH c.requester " +
           "JOIN FETCH c.recipient " +
           "WHERE c.recipient.id = :userId AND c.status = 'PENDING'")
    List<Contact> findPendingIncomingRequests(@Param("userId") UUID userId);

    @Query("SELECT c FROM Contact c " +
           "JOIN FETCH c.requester " +
           "JOIN FETCH c.recipient " +
           "WHERE c.requester.id = :userId AND c.status = 'PENDING'")
    List<Contact> findPendingOutgoingRequests(@Param("userId") UUID userId);

    @Query("SELECT c FROM Contact c " +
           "WHERE (c.requester.id = :userA AND c.recipient.id = :userB) " +
           "   OR (c.requester.id = :userB AND c.recipient.id = :userA)")
    Optional<Contact> findRelationship(@Param("userA") UUID userA, @Param("userB") UUID userB);
}
