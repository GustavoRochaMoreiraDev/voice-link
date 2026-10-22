package com.voicelink.presence;

import com.voicelink.users.User;
import com.voicelink.users.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    private static final Logger log = LoggerFactory.getLogger(PresenceService.class);

    private final Map<UUID, Set<String>> userSessions = new ConcurrentHashMap<>();
    private final Map<String, UUID> sessionToUser = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public PresenceService(SimpMessagingTemplate messagingTemplate, UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    public synchronized void userConnected(UUID userId, String sessionId) {
        sessionToUser.put(sessionId, userId);
        Set<String> sessions = userSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet());
        boolean wasOffline = sessions.isEmpty();
        sessions.add(sessionId);

        log.debug("Session connected: userId={}, sessionId={}, totalSessions={}", userId, sessionId, sessions.size());

        if (wasOffline) {
            broadcastPresence(userId, true);
        }
    }

    public synchronized void userDisconnected(String sessionId) {
        UUID userId = sessionToUser.remove(sessionId);
        if (userId != null) {
            Set<String> sessions = userSessions.get(userId);
            if (sessions != null) {
                sessions.remove(sessionId);
                log.debug("Session disconnected: userId={}, sessionId={}, remainingSessions={}", userId, sessionId, sessions.size());
                if (sessions.isEmpty()) {
                    userSessions.remove(userId);
                    broadcastPresence(userId, false);
                }
            }
        }
    }

    public boolean isUserOnline(UUID userId) {
        Set<String> sessions = userSessions.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    public Set<UUID> getOnlineUserIds() {
        return Collections.unmodifiableSet(userSessions.keySet());
    }

    private void broadcastPresence(UUID userId, boolean online) {
        userRepository.findById(userId).ifPresent(user -> {
            Map<String, Object> presenceEvent = Map.of(
                    "type", "USER_PRESENCE",
                    "userId", user.getId().toString(),
                    "username", user.getUsername(),
                    "displayName", user.getDisplayName(),
                    "online", online
            );
            log.info("Broadcasting presence: user={}, online={}", user.getUsername(), online);
            messagingTemplate.convertAndSend("/topic/presence", presenceEvent);
        });
    }
}
