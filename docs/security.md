# VoiceLink — Security & Threat Model

## 1. Threat Model & Principles

VoiceLink operates under a zero-trust model regarding client inputs: **the frontend is considered completely untrusted and controllable by the user.**

---

## 2. Authentication & Credential Management

1. **Password Hashing**:
   - Implemented with BCrypt (cost factor 12) through Spring Security's `BCryptPasswordEncoder`.
   - Passwords are never logged or returned in any API response.
2. **Stateless JSON Web Tokens (JWT)**:
   - Signed with HMAC-SHA256 (`Keys.hmacShaKeyFor`) using a 256-bit+ secret.
   - Contains only immutable subject ID (`sub`) and canonical `username`.
   - Explicit expiration (`app.jwt.expiration-ms`, default 24h).
   - Stored in the extension via `chrome.storage.local` (isolated to the extension context, inaccessible to website scripts).
   - Tokens are **never** passed in WebSocket query parameters (which could leak into proxy or access logs); instead, they are delivered in the STOMP `CONNECT` frame `Authorization: Bearer <token>` header.

---

## 3. Authorization & Anti-Spoofing

1. **Server-Derived Identity**:
   - Controllers and services extract the authenticated identity strictly from `UserPrincipal` injected by Spring Security.
   - Usernames supplied in request bodies or WebSocket signals are never trusted as proof of origin.
2. **Channel Interceptor (`WebSocketAuthInterceptor`)**:
   - Every STOMP connection is authenticated during the `CONNECT` handshake.
   - If the token is invalid or missing, the session is terminated before any message can be sent or subscribed to.
3. **Signaling Access Control**:
   - `SignalingService.processSignal` verifies that `principal.getId()` is an active participant in `callId`.
   - Third-party users cannot inject SDP or candidates into someone else's call.
4. **Conversation Privacy**:
   - `ChatService` asserts that the authenticated user is `participant1` or `participant2` before returning messages or saving new messages.

---

## 4. Chrome Extension Manifest V3 Security

1. **Content Security Policy (CSP)**:
   - Configured in `manifest.json`:
     `script-src 'self'; object-src 'self'; connect-src 'self' http://localhost:8080 ws://localhost:8080 ...`
   - Disallows `eval()` or loading external unverified scripts.
2. **Least Privilege Permissions**:
   - `storage`: for local JWT and preferences.
   - `notifications`: for incoming call alerts.
   - **No** `tabs`, `activeTab`, or `webNavigation` permissions requested, ensuring user browsing history remains completely private.
3. **Microphone Access**:
   - Microphone permission is requested only on-demand when initiating or accepting an audio call.
   - Tracks are immediately stopped (`track.stop()`) when the call terminates.

---

## 5. Residual Risks & Production Hardening

- **STUN/TURN Ephemeral Credentials**: For high-scale production, integrate Coturn with REST API ephemeral TURN credentials (`turn:credentials` with HMAC timestamp expiration) rather than static long-term credentials.
- **Rate Limiting**: In multi-instance deployments, enforce reverse-proxy rate limiting (e.g. Nginx or Spring Cloud Gateway) on `/api/auth/login` and `/api/calls/initiate` to prevent brute-force attacks and call spam.
- **Encrypted Media**: WebRTC uses DTLS-SRTP for all peer-to-peer audio. Audio is encrypted in transit between browsers and cannot be intercepted by network intermediaries.
