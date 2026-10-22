# VoiceLink — Troubleshooting & Common Issues

## 1. WebRTC & Audio Issues

### 1.1 "Microphone permission was denied"
- **Cause**: Chrome blocked microphone access for the extension or site.
- **Solution**:
  1. Open Chrome Settings $\to$ Privacy and Security $\to$ Site Settings $\to$ Microphone.
  2. Ensure microphone access is permitted for extensions and localhost.
  3. In VoiceLink, navigate to **Settings** and click **"Allow Microphone"**.

### 1.2 "Autoplay was prevented by browser policy"
- **Cause**: Modern browsers block audio playback unless initiated by a direct user interaction.
- **Solution**:
  - VoiceLink's `WebRTCService` automatically catches autoplay rejections and plays audio upon user click (such as clicking the "Accept" or "Unmute" buttons).

### 1.3 Call Connects, but No Audio is Heard
- **Cause**: Symmetric NAT or restrictive firewall blocking UDP direct traffic.
- **Solution**:
  1. Verify STUN server reachable: `stun:stun.l.google.com:19302`.
  2. If on a corporate VPN or strict NAT, ensure Coturn TURN server is running (`docker-compose up coturn`).
  3. Inspect `chrome://webrtc-internals` in Chrome to observe ICE candidate types (`host`, `srflx`, `relay`) and inbound/outbound audio packet counters (`bytesReceived`, `bytesSent`).

---

## 2. Chrome Extension Lifecycle (Manifest V3)

### 2.1 "Audio stops when I click away from the popup"
- **Cause**: In Chrome extensions, popup windows close automatically whenever the user clicks outside their window boundary. In Manifest V3, closing the popup DOM immediately terminates active WebRTC PeerConnections and MediaStreams.
- **Solution**:
  - VoiceLink provides an **"Open Dedicated Window"** button in both the header and the active call panel.
  - Clicking this opens a compact, persistent standalone Chrome window (`chrome.windows.create({ type: 'popup' })`) that stays open while you browse any other tabs or apps!

---

## 3. WebSocket & Backend Connection

### 3.1 "Failed to connect to ws://localhost:8080/ws"
- **Checklist**:
  1. Verify Spring Boot backend is running (`curl http://localhost:8080/error` returns 401 or standard error, not connection refused).
  2. Verify database migrations succeeded (`V1__initial_schema.sql` executed).
  3. Ensure CORS allowed origin patterns in `SecurityConfig.java` include `chrome-extension://*`.
