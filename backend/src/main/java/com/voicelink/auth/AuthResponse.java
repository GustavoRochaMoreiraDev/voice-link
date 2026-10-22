package com.voicelink.auth;

import com.voicelink.users.UserDto;

public record AuthResponse(
    String token,
    UserDto user
) {}
