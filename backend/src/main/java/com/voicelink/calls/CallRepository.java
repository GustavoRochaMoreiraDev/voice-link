package com.voicelink.calls;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CallRepository extends JpaRepository<Call, UUID> {

    @Query("SELECT c FROM Call c " +
           "JOIN FETCH c.caller " +
           "JOIN FETCH c.callee " +
           "WHERE (c.caller.id = :userId OR c.callee.id = :userId) " +
           "  AND c.status IN ('INITIATED', 'RINGING', 'ACCEPTED', 'CONNECTING', 'ACTIVE')")
    Optional<Call> findActiveCallForUser(@Param("userId") UUID userId);

    @Query("SELECT c FROM Call c " +
           "JOIN FETCH c.caller " +
           "JOIN FETCH c.callee " +
           "WHERE (c.caller.id = :userId OR c.callee.id = :userId) " +
           "ORDER BY c.createdAt DESC")
    Page<Call> findCallHistoryForUser(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT c FROM Call c " +
           "JOIN FETCH c.caller " +
           "JOIN FETCH c.callee " +
           "WHERE c.status IN ('INITIATED', 'RINGING') AND c.createdAt < :cutoffTime")
    List<Call> findExpiredPendingCalls(@Param("cutoffTime") Instant cutoffTime);

    @Query("SELECT c FROM Call c " +
           "JOIN FETCH c.caller " +
           "JOIN FETCH c.callee " +
           "WHERE c.id = :id")
    Optional<Call> findByIdWithParticipants(@Param("id") UUID id);
}
