package com.voicelink.users;

import com.voicelink.common.ResourceNotFoundException;
import com.voicelink.presence.PresenceService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PresenceService presenceService;

    public UserService(UserRepository userRepository, PresenceService presenceService) {
        this.userRepository = userRepository;
        this.presenceService = presenceService;
    }

    @Transactional(readOnly = true)
    public List<UserSummaryDto> searchUsers(String query, UUID currentUserId) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        String normalizedQuery = query.trim().toLowerCase();
        List<User> users = userRepository.searchByUsernamePrefix(
                normalizedQuery, currentUserId, PageRequest.of(0, 20));

        return users.stream()
                .map(u -> UserSummaryDto.of(u, presenceService.isUserOnline(u.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getUserSummary(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserSummaryDto.of(user, presenceService.isUserOnline(user.getId()));
    }

    @Transactional(readOnly = true)
    public User findById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
