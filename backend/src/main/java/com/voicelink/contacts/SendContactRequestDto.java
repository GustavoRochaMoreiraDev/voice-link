package com.voicelink.contacts;

import jakarta.validation.constraints.NotBlank;

public record SendContactRequestDto(
    @NotBlank(message = "Username is required")
    String username
) {}
