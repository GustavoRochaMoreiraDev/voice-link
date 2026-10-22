package com.voicelink.messages;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record SendMessageRequest(
    UUID conversationId,
    String recipientUsername,

    @NotBlank(message = "Message content cannot be blank")
    @Size(max = 2000, message = "Message cannot exceed 2000 characters")
    String content,

    String clientMessageId
) {}
