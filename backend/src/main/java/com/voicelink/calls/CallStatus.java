package com.voicelink.calls;

public enum CallStatus {
    INITIATED,
    RINGING,
    ACCEPTED,
    CONNECTING,
    ACTIVE,
    REJECTED,
    MISSED,
    ENDED,
    FAILED;

    public boolean isTerminal() {
        return this == REJECTED || this == MISSED || this == ENDED || this == FAILED;
    }

    public boolean isActiveOrPending() {
        return !isTerminal();
    }
}
