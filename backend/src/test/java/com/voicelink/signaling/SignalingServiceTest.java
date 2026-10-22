package com.voicelink.signaling;

import com.voicelink.calls.Call;
import com.voicelink.calls.CallService;
import com.voicelink.calls.CallStatus;
import com.voicelink.common.ForbiddenException;
import com.voicelink.users.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SignalingServiceTest {

    @Mock
    private CallService callService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private SignalingService signalingService;

    private User alice;
    private User bob;
    private Call call;

    @BeforeEach
    void setUp() {
        signalingService = new SignalingService(callService, messagingTemplate);

        alice = new User(UUID.randomUUID(), "alice", "alice", "alice@example.com", "hash", "Alice");
        bob = new User(UUID.randomUUID(), "bob", "bob", "bob@example.com", "hash", "Bob");
        call = new Call(UUID.randomUUID(), alice, bob, CallStatus.ACCEPTED);
    }

    @Test
    void processSignal_offerFromAlice_routesToBob() {
        SignalingMessage message = new SignalingMessage(
                call.getId(), "OFFER", "v=0\r\no=alice...", null, null, null);

        when(callService.verifyParticipant(call.getId(), alice.getId())).thenReturn(call);

        signalingService.processSignal(alice.getId(), message);

        verify(callService).updateCallStatus(call.getId(), CallStatus.CONNECTING, alice.getId());
        verify(messagingTemplate).convertAndSendToUser(
                eq("bob"),
                eq("/queue/signaling"),
                eq(message)
        );
    }

    @Test
    void processSignal_answerFromBob_routesToAlice() {
        call.setStatus(CallStatus.CONNECTING);
        SignalingMessage message = new SignalingMessage(
                call.getId(), "ANSWER", "v=0\r\no=bob...", null, null, null);

        when(callService.verifyParticipant(call.getId(), bob.getId())).thenReturn(call);

        signalingService.processSignal(bob.getId(), message);

        verify(callService).updateCallStatus(call.getId(), CallStatus.ACTIVE, bob.getId());
        verify(messagingTemplate).convertAndSendToUser(
                eq("alice"),
                eq("/queue/signaling"),
                eq(message)
        );
    }

    @Test
    void processSignal_unauthorizedUser_throwsForbiddenException() {
        UUID eveId = UUID.randomUUID();
        SignalingMessage message = new SignalingMessage(
                call.getId(), "OFFER", "malicious-sdp", null, null, null);

        when(callService.verifyParticipant(call.getId(), eveId))
                .thenThrow(new ForbiddenException("User is not a participant in call"));

        assertThatThrownBy(() -> signalingService.processSignal(eveId, message))
                .isInstanceOf(ForbiddenException.class);

        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), any());
    }
}
