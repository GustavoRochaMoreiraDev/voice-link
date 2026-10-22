package com.voicelink.signaling;

import com.voicelink.calls.CallActionRequest;
import com.voicelink.calls.CallService;
import com.voicelink.calls.InitiateCallRequest;
import com.voicelink.conversations.ChatService;
import com.voicelink.messages.SendMessageRequest;
import com.voicelink.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
public class SignalingWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(SignalingWebSocketController.class);

    private final SignalingService signalingService;
    private final CallService callService;
    private final ChatService chatService;

    public SignalingWebSocketController(
            SignalingService signalingService,
            CallService callService,
            ChatService chatService) {
        this.signalingService = signalingService;
        this.callService = callService;
        this.chatService = chatService;
    }

    @MessageMapping("/call/signal")
    public void handleSignal(@Payload SignalingMessage message, Principal principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return;
        signalingService.processSignal(userId, message);
    }

    @MessageMapping("/call/initiate")
    public void handleCallInitiate(@Payload InitiateCallRequest request, Principal principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return;
        callService.initiateCall(userId, request.targetUsername());
    }

    @MessageMapping("/call/accept")
    public void handleCallAccept(@Payload CallActionRequest request, Principal principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return;
        callService.acceptCall(request.callId(), userId);
    }

    @MessageMapping("/call/reject")
    public void handleCallReject(@Payload CallActionRequest request, Principal principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return;
        callService.rejectCall(request.callId(), userId, request.reason());
    }

    @MessageMapping("/call/end")
    public void handleCallEnd(@Payload CallActionRequest request, Principal principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return;
        callService.endCall(request.callId(), userId, request.reason());
    }

    @MessageMapping("/chat/send")
    public void handleChatMessage(@Payload SendMessageRequest request, Principal principal) {
        UUID userId = extractUserId(principal);
        if (userId == null) return;
        chatService.sendMessage(userId, request);
    }

    private UUID extractUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        log.warn("Principal could not be resolved or is not authenticated: {}", principal);
        return null;
    }
}
