package com.voicelink.messages;

import com.voicelink.users.UserSummaryDto;

import java.time.Instant;
import java.util.UUID;

public record MessageDto(
    UUID id,
    UUID conversationId,
    UserSummaryDto sender,
    String content,
    String clientMessageId,
    Instant createdAt
) {
    public static MessageDto of(Message message, boolean senderOnline) {
        return new MessageDto(
            message.getId(),
            message.getConversation().getId(),
            UserSummaryDto.of(message.getSender(), senderOnline),
            message.getContent(),
            message.getClientMessageId(),
            message.getCreatedAt()
        );
    }
}
