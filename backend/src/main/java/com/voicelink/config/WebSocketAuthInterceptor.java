package com.voicelink.config;

import com.voicelink.security.JwtService;
import com.voicelink.security.UserPrincipal;
import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public WebSocketAuthInterceptor(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            List<String> authHeaders = accessor.getNativeHeader("Authorization");
            String authHeader = (authHeaders != null && !authHeaders.isEmpty()) ? authHeaders.get(0) : null;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtService.validateToken(token)) {
                    UUID userId = jwtService.getUserIdFromToken(token);
                    Optional<User> userOpt = userRepository.findById(userId);

                    if (userOpt.isPresent() && userOpt.get().isActive()) {
                        UserPrincipal principal = UserPrincipal.create(userOpt.get());
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                        accessor.setUser(auth);
                        log.debug("STOMP connect authenticated for user: {}", principal.getUsername());
                    } else {
                        log.warn("STOMP connection rejected: user not found or inactive: {}", userId);
                    }
                } else {
                    log.warn("STOMP connection rejected: invalid JWT token");
                }
            } else {
                log.warn("STOMP connection rejected: missing or malformed Authorization header");
            }
        }

        return message;
    }
}
