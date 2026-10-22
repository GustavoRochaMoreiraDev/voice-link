package com.voicelink.calls;

import com.voicelink.common.BusinessException;
import com.voicelink.common.ConflictException;
import com.voicelink.common.ForbiddenException;
import com.voicelink.common.ResourceNotFoundException;
import com.voicelink.presence.PresenceService;
import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class CallService {

    private static final Logger log = LoggerFactory.getLogger(CallService.class);
    private static final int CALL_TIMEOUT_SECONDS = 45;

    private final CallRepository callRepository;
    private final UserRepository userRepository;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    public CallService(
            CallRepository callRepository,
            UserRepository userRepository,
            PresenceService presenceService,
            SimpMessagingTemplate messagingTemplate) {
        this.callRepository = callRepository;
        this.userRepository = userRepository;
        this.presenceService = presenceService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public CallDto initiateCall(UUID callerId, String targetUsername) {
        String normalizedTarget = targetUsername.trim().toLowerCase();

        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("Caller not found"));

        User callee = userRepository.findByNormalizedUsername(normalizedTarget)
                .orElseThrow(() -> new ResourceNotFoundException("User @" + targetUsername + " not found"));

        if (caller.getId().equals(callee.getId())) {
            throw new BusinessException("You cannot call yourself");
        }

        // Check if caller already has an active or ringing call
        Optional<Call> callerActive = callRepository.findActiveCallForUser(caller.getId());
        if (callerActive.isPresent()) {
            throw new ConflictException("You already have an active or pending call");
        }

        // Check if callee is online
        if (!presenceService.isUserOnline(callee.getId())) {
            throw new BusinessException("User @" + callee.getUsername() + " is currently offline");
        }

        // Check if callee is busy
        Optional<Call> calleeActive = callRepository.findActiveCallForUser(callee.getId());
        if (calleeActive.isPresent()) {
            throw new ConflictException("User @" + callee.getUsername() + " is currently in another call");
        }

        Call call = new Call(UUID.randomUUID(), caller, callee, CallStatus.RINGING);
        Call savedCall = callRepository.save(call);

        log.info("Call initiated: id={}, from={}, to={}", savedCall.getId(), caller.getUsername(), callee.getUsername());

        // Notify callee via WebSocket
        CallDto dto = toDto(savedCall);
        notifyUser(callee.getUsername(), "/queue/calls", Map.of(
                "type", "CALL_INCOMING",
                "call", dto
        ));

        // Notify caller with initiation confirmation
        notifyUser(caller.getUsername(), "/queue/calls", Map.of(
                "type", "CALL_INITIATED",
                "call", dto
        ));

        return dto;
    }

    @Transactional
    public CallDto acceptCall(UUID callId, UUID calleeId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call not found"));

        if (!call.getCallee().getId().equals(calleeId)) {
            throw new ForbiddenException("Only the callee can accept this call");
        }

        if (call.getStatus() != CallStatus.RINGING) {
            throw new BusinessException("Call is not in ringing state (current: " + call.getStatus() + ")");
        }

        call.setStatus(CallStatus.ACCEPTED);
        call.setAcceptedAt(Instant.now());
        Call saved = callRepository.save(call);

        log.info("Call accepted: id={}, callee={}", call.getId(), call.getCallee().getUsername());
        CallDto dto = toDto(saved);

        // Notify both participants
        notifyUser(call.getCaller().getUsername(), "/queue/calls", Map.of("type", "CALL_ACCEPTED", "call", dto));
        notifyUser(call.getCallee().getUsername(), "/queue/calls", Map.of("type", "CALL_ACCEPTED", "call", dto));

        return dto;
    }

    @Transactional
    public CallDto rejectCall(UUID callId, UUID calleeId, String reason) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call not found"));

        if (!call.getCallee().getId().equals(calleeId)) {
            throw new ForbiddenException("Only the callee can reject this call");
        }

        if (call.getStatus().isTerminal()) {
            return toDto(call);
        }

        call.setStatus(CallStatus.REJECTED);
        call.setEndedAt(Instant.now());
        call.setEndReason(reason != null ? reason : "DECLINED");
        Call saved = callRepository.save(call);

        log.info("Call rejected: id={}, callee={}", call.getId(), call.getCallee().getUsername());
        CallDto dto = toDto(saved);

        notifyUser(call.getCaller().getUsername(), "/queue/calls", Map.of("type", "CALL_REJECTED", "call", dto));
        notifyUser(call.getCallee().getUsername(), "/queue/calls", Map.of("type", "CALL_REJECTED", "call", dto));

        return dto;
    }

    @Transactional
    public CallDto cancelCall(UUID callId, UUID callerId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call not found"));

        if (!call.getCaller().getId().equals(callerId)) {
            throw new ForbiddenException("Only the caller can cancel this call");
        }

        if (call.getStatus().isTerminal()) {
            return toDto(call);
        }

        call.setStatus(CallStatus.MISSED);
        call.setEndedAt(Instant.now());
        call.setEndReason("CANCELLED_BY_CALLER");
        Call saved = callRepository.save(call);

        log.info("Call cancelled by caller: id={}", call.getId());
        CallDto dto = toDto(saved);

        notifyUser(call.getCallee().getUsername(), "/queue/calls", Map.of("type", "CALL_CANCELLED", "call", dto));
        notifyUser(call.getCaller().getUsername(), "/queue/calls", Map.of("type", "CALL_CANCELLED", "call", dto));

        return dto;
    }

    @Transactional
    public CallDto endCall(UUID callId, UUID userId, String reason) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call not found"));

        boolean isParticipant = call.getCaller().getId().equals(userId)
                || call.getCallee().getId().equals(userId);

        if (!isParticipant) {
            throw new ForbiddenException("Not authorized to end this call");
        }

        if (call.getStatus().isTerminal()) {
            return toDto(call);
        }

        call.setStatus(CallStatus.ENDED);
        Instant now = Instant.now();
        call.setEndedAt(now);
        call.setEndReason(reason != null ? reason : "NORMAL_HANGUP");

        if (call.getAcceptedAt() != null) {
            long seconds = Duration.between(call.getAcceptedAt(), now).getSeconds();
            call.setDurationSeconds((int) Math.max(0, seconds));
        }

        Call saved = callRepository.save(call);
        log.info("Call ended: id={}, duration={}s, reason={}", call.getId(), call.getDurationSeconds(), call.getEndReason());
        CallDto dto = toDto(saved);

        notifyUser(call.getCaller().getUsername(), "/queue/calls", Map.of("type", "CALL_ENDED", "call", dto));
        notifyUser(call.getCallee().getUsername(), "/queue/calls", Map.of("type", "CALL_ENDED", "call", dto));

        return dto;
    }

    @Transactional
    public void updateCallStatus(UUID callId, CallStatus status, UUID userId) {
        Call call = callRepository.findByIdWithParticipants(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call not found"));

        verifyParticipant(call, userId);

        if (!call.getStatus().isTerminal()) {
            call.setStatus(status);
            Call saved = callRepository.save(call);
            CallDto dto = toDto(saved);
            notifyUser(call.getCaller().getUsername(), "/queue/calls", Map.of("type", "CALL_STATE", "call", dto));
            notifyUser(call.getCallee().getUsername(), "/queue/calls", Map.of("type", "CALL_STATE", "call", dto));
        }
    }

    @Scheduled(fixedRate = 5000)
    @Transactional
    public void checkCallTimeouts() {
        Instant cutoff = Instant.now().minusSeconds(CALL_TIMEOUT_SECONDS);
        List<Call> expired = callRepository.findExpiredPendingCalls(cutoff);

        for (Call call : expired) {
            log.info("Call timed out: id={}", call.getId());
            call.setStatus(CallStatus.MISSED);
            call.setEndedAt(Instant.now());
            call.setEndReason("NO_ANSWER_TIMEOUT");
            callRepository.save(call);

            CallDto dto = toDto(call);
            notifyUser(call.getCaller().getUsername(), "/queue/calls", Map.of("type", "CALL_TIMEOUT", "call", dto));
            notifyUser(call.getCallee().getUsername(), "/queue/calls", Map.of("type", "CALL_TIMEOUT", "call", dto));
        }
    }

    @Transactional(readOnly = true)
    public Optional<CallDto> getActiveCall(UUID userId) {
        return callRepository.findActiveCallForUser(userId).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<CallDto> getCallHistory(UUID userId, Pageable pageable) {
        return callRepository.findCallHistoryForUser(userId, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Call verifyParticipant(UUID callId, UUID userId) {
        Call call = callRepository.findByIdWithParticipants(callId)
                .orElseThrow(() -> new ResourceNotFoundException("Call not found"));
        verifyParticipant(call, userId);
        return call;
    }

    private void verifyParticipant(Call call, UUID userId) {
        boolean isParticipant = call.getCaller().getId().equals(userId)
                || call.getCallee().getId().equals(userId);
        if (!isParticipant) {
            throw new ForbiddenException("User is not a participant in call " + call.getId());
        }
    }

    public CallDto toDto(Call call) {
        boolean callerOnline = presenceService.isUserOnline(call.getCaller().getId());
        boolean calleeOnline = presenceService.isUserOnline(call.getCallee().getId());
        return CallDto.of(call, callerOnline, calleeOnline);
    }

    private void notifyUser(String username, String destination, Object payload) {
        try {
            messagingTemplate.convertAndSendToUser(username, destination, payload);
        } catch (Exception e) {
            log.warn("Failed to deliver call event to {}: {}", username, e.getMessage());
        }
    }
}
