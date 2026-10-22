package com.voicelink.contacts;

import com.voicelink.users.User;
import com.voicelink.users.UserSummaryDto;

import java.time.Instant;
import java.util.UUID;

public record ContactDto(
    UUID contactId,
    UserSummaryDto user,
    Contact.Status status,
    boolean isIncoming,
    Instant createdAt
) {
    public static ContactDto of(Contact contact, UUID currentUserId, boolean online) {
        boolean incoming = contact.getRecipient().getId().equals(currentUserId);
        User otherUser = incoming ? contact.getRequester() : contact.getRecipient();

        return new ContactDto(
            contact.getId(),
            UserSummaryDto.of(otherUser, online),
            contact.getStatus(),
            incoming,
            contact.getCreatedAt()
        );
    }
}
