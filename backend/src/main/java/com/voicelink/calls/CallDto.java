package com.voicelink.calls;

import com.voicelink.users.UserSummaryDto;

import java.time.Instant;
import java.util.UUID;

public record CallDto(
    UUID id,
    UserSummaryDto caller,
    UserSummaryDto callee,
    CallStatus status,
    Instant createdAt,
    Instant acceptedAt,
    Instant endedAt,
    String endReason,
    Integer durationSeconds
) {
    public static CallDto of(Call call, boolean callerOnline, boolean calleeOnline) {
        return new CallDto(
            call.getId(),
            UserSummaryDto.of(call.getCaller(), callerOnline),
            UserSummaryDto.of(call.getCallee(), calleeOnline),
            call.getStatus(),
            call.getCreatedAt(),
            call.getAcceptedAt(),
            call.getEndedAt(),
            call.getEndReason(),
            call.getDurationSeconds()
        );
    }
}
