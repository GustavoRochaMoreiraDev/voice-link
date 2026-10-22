# VoiceLink — WebRTC Signaling Protocol Specification

## 1. Overview

WebRTC requires an out-of-band signaling mechanism for peers to discover network paths (ICE Candidates) and negotiate audio codecs and capabilities (Session Description Protocol - SDP Offer/Answer).

VoiceLink uses **STOMP over WebSocket** to transport signaling messages reliably and securely.

---

## 2. STOMP Destinations

| Channel | Description | Direction |
|---|---|---|
| `/app/call/signal` | Client sends SDP Offer, Answer, or ICE Candidate | Client $\to$ Server |
| `/user/queue/signaling` | Client receives signaling messages for their active call | Server $\to$ Client |
| `/app/call/initiate` | Initiate a new voice call to a target username | Client $\to$ Server |
| `/app/call/accept` | Accept an incoming call | Client $\to$ Server |
| `/app/call/reject` | Reject an incoming call | Client $\to$ Server |
| `/app/call/end` | Hang up an active call | Client $\to$ Server |
| `/user/queue/calls` | Call lifecycle events (incoming, accepted, rejected, ended) | Server $\to$ Client |

---

## 3. Signaling Message Payload (`SignalingMessage`)

```typescript
export interface SignalingMessage {
  callId: string;                     // UUID of the active call
  type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE';
  sdp?: string;                       // SDP payload (for OFFER / ANSWER)
  candidate?: string;                 // Candidate string (for ICE_CANDIDATE)
  sdpMid?: string;                    // Media stream ID
  sdpMLineIndex?: number;             // Media stream index
}
```

### 3.1 SDP Offer Frame Example
```json
{
  "callId": "d3b07384-d113-4a11-b062-817351ad84a3",
  "type": "OFFER",
  "sdp": "v=0\r\no=alice 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 126..."
}
```

### 3.2 SDP Answer Frame Example
```json
{
  "callId": "d3b07384-d113-4a11-b062-817351ad84a3",
  "type": "ANSWER",
  "sdp": "v=0\r\no=bob 654321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111..."
}
```

### 3.3 ICE Candidate Frame Example
```json
{
  "callId": "d3b07384-d113-4a11-b062-817351ad84a3",
  "type": "ICE_CANDIDATE",
  "candidate": "candidate:842163049 1 udp 1677729535 192.168.1.100 54123 typ srflx raddr 10.0.0.2 rport 54123",
  "sdpMid": "0",
  "sdpMLineIndex": 0
}
```

---

## 4. End-to-End Signaling Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Alice as User A (Caller)
    participant WS as Backend Signaling Server
    actor Bob as User B (Callee)

    Alice->>WS: POST /api/calls/initiate { targetUsername: "bob" }
    WS->>WS: Validate availability & permissions (call state = RINGING)
    WS-->>Bob: /user/queue/calls -> CALL_INCOMING { callId, caller: Alice }
    WS-->>Alice: /user/queue/calls -> CALL_INITIATED { callId, callee: Bob }
    Note over Bob: Ringtone plays, Incoming Modal displays

    Bob->>WS: POST /api/calls/{callId}/accept
    WS->>WS: Transition call state -> ACCEPTED
    WS-->>Alice: /user/queue/calls -> CALL_ACCEPTED
    WS-->>Bob: /user/queue/calls -> CALL_ACCEPTED

    Note over Alice: Alice captures Mic & creates WebRTC PeerConnection
    Alice->>Alice: createOffer() -> setLocalDescription(offer)
    Alice->>WS: /app/call/signal { type: "OFFER", sdp: offer, callId }
    WS->>WS: Verify Alice is caller; transition state -> CONNECTING
    WS-->>Bob: /user/queue/signaling { type: "OFFER", sdp: offer, callId }

    Note over Bob: Bob captures Mic & creates WebRTC PeerConnection
    Bob->>Bob: setRemoteDescription(offer) -> createAnswer() -> setLocalDescription(answer)
    Bob->>WS: /app/call/signal { type: "ANSWER", sdp: answer, callId }
    WS->>WS: Verify Bob is callee; transition state -> ACTIVE
    WS-->>Alice: /user/queue/signaling { type: "ANSWER", sdp: answer, callId }

    Alice->>Alice: setRemoteDescription(answer)

    par ICE Candidate Trickle
        Alice->>WS: /app/call/signal { type: "ICE_CANDIDATE", candidate: ... }
        WS-->>Bob: /user/queue/signaling { type: "ICE_CANDIDATE", candidate: ... }
        Bob->>Bob: addIceCandidate(...)
    and
        Bob->>WS: /app/call/signal { type: "ICE_CANDIDATE", candidate: ... }
        WS-->>Alice: /user/queue/signaling { type: "ICE_CANDIDATE", candidate: ... }
        Alice->>Alice: addIceCandidate(...)
    end

    Note over Alice,Bob: P2P Audio Flow established via WebRTC SRTP!
```

---

## 5. Security & Isolation Controls

1. **Identity derived from Authentication**: The sender of any signaling message is identified strictly by the authenticated `Principal` associated with the STOMP session, never by client-supplied fields.
2. **Participant Verification**: The `SignalingService` queries the database for `callId` and asserts that `principal.getId()` equals either `call.getCaller().getId()` or `call.getCallee().getId()`. If not, a `ForbiddenException` is thrown immediately.
3. **Target Routing**: Signals are sent exclusively to the counterpart's private queue (`/user/{counterpartUsername}/queue/signaling`). No broadcast or unauthorized peer discovery is permitted.
4. **ICE Candidate Queueing**: To protect against race conditions where candidates arrive before `setRemoteDescription` completes, the frontend `WebRTCService` automatically queues incoming candidates and drains them once the remote description is applied.
