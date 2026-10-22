package com.voicelink.calls;

import com.voicelink.common.BusinessException;
import com.voicelink.common.ConflictException;
import com.voicelink.common.ForbiddenException;
import com.voicelink.presence.PresenceService;
import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CallServiceTest {

    @Mock
    private CallRepository callRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PresenceService presenceService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private CallService callService;

    private User caller;
    private User callee;

    @BeforeEach
    void setUp() {
        callService = new CallService(callRepository, userRepository, presenceService, messagingTemplate);

        caller = new User(UUID.randomUUID(), "alice", "alice", "alice@example.com", "hash", "Alice");
        callee = new User(UUID.randomUUID(), "bob", "bob", "bob@example.com", "hash", "Bob");
    }

    @Test
    void initiateCall_success() {
        when(userRepository.findById(caller.getId())).thenReturn(Optional.of(caller));
        when(userRepository.findByNormalizedUsername("bob")).thenReturn(Optional.of(callee));
        when(callRepository.findActiveCallForUser(caller.getId())).thenReturn(Optional.empty());
        when(callRepository.findActiveCallForUser(callee.getId())).thenReturn(Optional.empty());
        when(presenceService.isUserOnline(callee.getId())).thenReturn(true);

        Call call = new Call(UUID.randomUUID(), caller, callee, CallStatus.RINGING);
        when(callRepository.save(any(Call.class))).thenReturn(call);

        CallDto result = callService.initiateCall(caller.getId(), "bob");

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo(CallStatus.RINGING);
        assertThat(result.caller().username()).isEqualTo("alice");
        assertThat(result.callee().username()).isEqualTo("bob");

        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), eq("/queue/calls"), any(Object.class));
    }

    @Test
    void initiateCall_cannotCallSelf_throwsBusinessException() {
        when(userRepository.findById(caller.getId())).thenReturn(Optional.of(caller));
        when(userRepository.findByNormalizedUsername("alice")).thenReturn(Optional.of(caller));

        assertThatThrownBy(() -> callService.initiateCall(caller.getId(), "alice"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("You cannot call yourself");
    }

    @Test
    void initiateCall_calleeOffline_throwsBusinessException() {
        when(userRepository.findById(caller.getId())).thenReturn(Optional.of(caller));
        when(userRepository.findByNormalizedUsername("bob")).thenReturn(Optional.of(callee));
        when(callRepository.findActiveCallForUser(caller.getId())).thenReturn(Optional.empty());
        when(presenceService.isUserOnline(callee.getId())).thenReturn(false);

        assertThatThrownBy(() -> callService.initiateCall(caller.getId(), "bob"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("is currently offline");
    }

    @Test
    void initiateCall_callerAlreadyInCall_throwsConflictException() {
        when(userRepository.findById(caller.getId())).thenReturn(Optional.of(caller));
        when(userRepository.findByNormalizedUsername("bob")).thenReturn(Optional.of(callee));
        when(callRepository.findActiveCallForUser(caller.getId())).thenReturn(Optional.of(new Call()));

        assertThatThrownBy(() -> callService.initiateCall(caller.getId(), "bob"))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already have an active or pending call");
    }

    @Test
    void acceptCall_success() {
        UUID callId = UUID.randomUUID();
        Call call = new Call(callId, caller, callee, CallStatus.RINGING);
        when(callRepository.findById(callId)).thenReturn(Optional.of(call));
        when(callRepository.save(any(Call.class))).thenAnswer(i -> i.getArgument(0));

        CallDto result = callService.acceptCall(callId, callee.getId());

        assertThat(result.status()).isEqualTo(CallStatus.ACCEPTED);
        assertThat(call.getAcceptedAt()).isNotNull();
        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), eq("/queue/calls"), any(Object.class));
    }

    @Test
    void acceptCall_byCaller_throwsForbiddenException() {
        UUID callId = UUID.randomUUID();
        Call call = new Call(callId, caller, callee, CallStatus.RINGING);
        when(callRepository.findById(callId)).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> callService.acceptCall(callId, caller.getId()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only the callee can accept");
    }

    @Test
    void rejectCall_success() {
        UUID callId = UUID.randomUUID();
        Call call = new Call(callId, caller, callee, CallStatus.RINGING);
        when(callRepository.findById(callId)).thenReturn(Optional.of(call));
        when(callRepository.save(any(Call.class))).thenAnswer(i -> i.getArgument(0));

        CallDto result = callService.rejectCall(callId, callee.getId(), "BUSY");

        assertThat(result.status()).isEqualTo(CallStatus.REJECTED);
        assertThat(call.getEndReason()).isEqualTo("BUSY");
        assertThat(call.getEndedAt()).isNotNull();
    }

    @Test
    void endCall_calculatesDuration_success() {
        UUID callId = UUID.randomUUID();
        Call call = new Call(callId, caller, callee, CallStatus.ACTIVE);
        call.setAcceptedAt(Instant.now().minusSeconds(125));
        when(callRepository.findById(callId)).thenReturn(Optional.of(call));
        when(callRepository.save(any(Call.class))).thenAnswer(i -> i.getArgument(0));

        CallDto result = callService.endCall(callId, caller.getId(), "HANGUP");

        assertThat(result.status()).isEqualTo(CallStatus.ENDED);
        assertThat(call.getDurationSeconds()).isGreaterThanOrEqualTo(124);
        assertThat(call.getEndReason()).isEqualTo("HANGUP");
    }

    @Test
    void endCall_unauthorizedUser_throwsForbiddenException() {
        UUID callId = UUID.randomUUID();
        Call call = new Call(callId, caller, callee, CallStatus.ACTIVE);
        UUID eveId = UUID.randomUUID();
        when(callRepository.findById(callId)).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> callService.endCall(callId, eveId, "MALICIOUS"))
                .isInstanceOf(ForbiddenException.class);
    }
}
