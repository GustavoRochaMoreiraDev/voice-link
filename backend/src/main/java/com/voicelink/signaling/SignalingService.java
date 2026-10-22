package com.voicelink.signaling;

import com.voicelink.calls.Call;
import com.voicelink.calls.CallService;
import com.voicelink.calls.CallStatus;
import com.voicelink.users.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SignalingService {

    private static final Logger log = LoggerFactory.getLogger(SignalingService.class);

    private final CallService callService;
    private final SimpMessagingTemplate messagingTemplate;

    public SignalingService(CallService callService, SimpMessagingTemplate messagingTemplate) {
        this.callService = callService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public void processSignal(UUID senderId, SignalingMessage message) {
        if (message.callId() == null || message.type() == null) {
            log.warn("Invalid signaling message received from user {}: missing callId or type", senderId);
            return;
        }

        // Verify call and participant authorization
        Call call = callService.verifyParticipant(message.callId(), senderId);

        if (call.getStatus().isTerminal()) {
            log.warn("Ignored signal for terminal call {}: status={}", call.getId(), call.getStatus());
            return;
        }

        // Determine counterpart
        User recipient = call.getCaller().getId().equals(senderId) ? call.getCallee() : call.getCaller();

        log.debug("Routing signal [{}] for call {} from {} to {}",
                message.type(), call.getId(), senderId, recipient.getUsername());

        // Update state on offer/answer progression
        if ("OFFER".equalsIgnoreCase(message.type()) && call.getStatus() == CallStatus.ACCEPTED) {
            callService.updateCallStatus(call.getId(), CallStatus.CONNECTING, senderId);
        } else if ("ANSWER".equalsIgnoreCase(message.type()) && call.getStatus() == CallStatus.CONNECTING) {
            callService.updateCallStatus(call.getId(), CallStatus.ACTIVE, senderId);
        }

        // Deliver strictly to counterpart's private queue
        messagingTemplate.convertAndSendToUser(
                recipient.getUsername(),
                "/queue/signaling",
                message
        );
    }
}
