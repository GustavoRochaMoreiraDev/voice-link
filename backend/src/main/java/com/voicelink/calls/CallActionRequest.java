package com.voicelink.calls;

import java.util.UUID;

public record CallActionRequest(
    UUID callId,
    String reason
) {}
