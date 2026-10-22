package com.voicelink.users;

import java.time.Instant;
import java.util.UUID;

public record UserDto(
    UUID id,
    String username,
    String displayName,
    String email,
    Instant createdAt
) {
    public static UserDto fromEntity(User user) {
        return new UserDto(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            user.getCreatedAt()
        );
    }
}
