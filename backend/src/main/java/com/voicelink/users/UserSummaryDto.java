package com.voicelink.users;

import java.util.UUID;

public record UserSummaryDto(
    UUID id,
    String username,
    String displayName,
    boolean online
) {
    public static UserSummaryDto of(User user, boolean online) {
        return new UserSummaryDto(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            online
        );
    }
}
