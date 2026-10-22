package com.voicelink.conversations;

import com.voicelink.messages.MessageDto;
import com.voicelink.users.UserSummaryDto;

import java.time.Instant;
import java.util.UUID;

public record ConversationDto(
    UUID id,
    String type,
    UserSummaryDto participant,
    MessageDto lastMessage,
    Instant updatedAt
) {}
