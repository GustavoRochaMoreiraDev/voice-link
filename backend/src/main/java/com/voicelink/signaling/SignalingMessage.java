package com.voicelink.signaling;

import java.util.UUID;

public record SignalingMessage(
    UUID callId,
    String type,        // "OFFER", "ANSWER", "ICE_CANDIDATE"
    String sdp,         // SDP payload for OFFER/ANSWER
    String candidate,   // ICE candidate string
    String sdpMid,      // media stream ID
    Integer sdpMLineIndex // media stream index
) {}
