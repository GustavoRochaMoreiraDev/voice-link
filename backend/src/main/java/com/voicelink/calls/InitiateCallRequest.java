package com.voicelink.calls;

import jakarta.validation.constraints.NotBlank;

public record InitiateCallRequest(
    @NotBlank(message = "Target username is required")
    String targetUsername
) {}
