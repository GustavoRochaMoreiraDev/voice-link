# VoiceLink — Chrome Browser Extension for Voice Calls & Real-Time Chat

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Angular](https://img.shields.io/badge/Angular-17.3-red.svg)](https://angular.dev/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Peer--to--Peer%20Audio-blue.svg)](https://webrtc.org/)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-yellow.svg)](https://developer.chrome.com/docs/extensions/mv3/)

**VoiceLink** is a lightweight, Discord-inspired Google Chrome extension designed for direct peer-to-peer voice calling and real-time private chat.

The system is architected with strict separation of concerns:
- **Spring Boot Backend**: Manages user authentication, presence, contacts, call state coordination, and WebRTC signaling relay. **The backend never touches or carries audio.**
- **Chrome Extension (Angular 17 Standalone)**: Provides a dark-mode interface, WebRTC media capture, peer-to-peer audio negotiation (SDP Offer/Answer & ICE Trickle), microphone controls, and chat persistence.

---

## 1. Feature Highlights

- **User Identity & Auth**: Secure registration, login, case-insensitive normalized usernames (`^[a-zA-Z0-9_]{3,30}$`), BCrypt password hashing, and stateless JWT.
- **User Discovery & Contacts**: Search users by username, send/accept/reject contact requests, remove contacts.
- **Real-Time Presence**: Online/offline status indicators driven by WebSocket STOMP and resilient multi-session tracking.
- **WebRTC Voice Calling**:
  - Two-person voice calls with direct peer-to-peer audio (`audio: true`, `video: false`).
  - Ringtone chime synthesized via Web Audio API (zero external asset dependency).
  - Incoming call notification modal with Accept and Decline actions.
  - In-call controls: Microphone Mute/Unmute, live call timer, connection status indicator, and Hang Up.
  - Dedicated call popout window to ensure calls remain active when clicking away from Chrome popups.
- **Real-Time Text Chat**:
  - 1-on-1 private messaging with instant delivery via WebSocket.
  - Persisted history with chronological pagination.
  - Client message idempotency preventing duplicate deliveries.
- **Call History**: Complete logs of incoming, outgoing, missed, and ended calls with duration and timestamps.
- **Audio Device Management**: Microphone permission verification, device enumeration, and real-time audio level test meter.

---

## 2. Technology Stack

### Frontend
- **Framework**: Angular 17.3+ (TypeScript, Standalone Components, Signals).
- **Reactive Streams**: RxJS for event streams and state.
- **WebRTC**: Native `RTCPeerConnection` with STUN (`stun:stun.l.google.com:19302`) and optional Coturn TURN relay.
- **WebSocket**: `@stomp/stompjs` for robust STOMP messaging over WebSocket with auto-reconnection.
- **Platform**: Chrome Extensions Manifest V3 (`action.default_popup` + dedicated popup window).
- **Design System**: Custom modern dark theme using CSS variables and accessible high-contrast design tokens.

### Backend
- **Language**: Java 21 LTS (tested with Java 21-24).
- **Framework**: Spring Boot 3.3.4.
- **Security**: Spring Security 6 with stateless JWT authentication filter and STOMP Channel Interceptor.
- **Database**: PostgreSQL with Flyway database migrations (`V1__initial_schema.sql`) and H2 in-memory fallback for testing.
- **Build Tool**: Apache Maven with bundled Maven Wrapper (`mvnw`).

---

## 3. Monorepo Organization

```
voicelink/
  ├── backend/               # Spring Boot 3.3.x backend
  │   ├── src/main/java/     # Application modules (auth, users, contacts, calls, chat, signaling)
  │   ├── src/main/resources/# application.yml, Flyway SQL migrations
  │   └── src/test/java/     # Automated test suites
  ├── frontend/              # Angular 17.3+ Chrome Extension
  │   ├── src/app/core/      # Core services (WebRTC, WebSocket, Call, Chat, Auth, Presence)
  │   ├── src/app/features/  # Standalone UI components (auth, contacts, chat, calls, settings)
  │   └── src/manifest.json  # Chrome Extension Manifest V3
  ├── infrastructure/        # Coturn TURN server configuration
  ├── scripts/               # PowerShell and Bash automated build/run scripts
  ├── docs/                  # In-depth architectural and technical documentation
  ├── docker-compose.yml     # Complete Docker container stack
  └── README.md              # Project documentation
```

---

## 4. Prerequisites

- **Java**: JDK 21 or higher.
- **Node.js**: Node 18.x, 20.x, or 22.x with npm.
- **PostgreSQL**: Local PostgreSQL service or Docker.
- **Google Chrome**: For loading the extension.

---

## 5. Quickstart & Local Setup

### Option A: Using Docker Compose (Fastest)

```bash
# 1. Start PostgreSQL, Spring Boot backend, and Coturn TURN server
docker-compose up -d --build

# 2. Build the Angular frontend extension
cd frontend
npm install
npm run build
```

The extension package will be ready in `frontend/dist/voicelink-extension`.

---

### Option B: Running Locally on Host

#### Step 1: Start PostgreSQL
Ensure PostgreSQL is running on port 5432 with database `voicelink_db` (or set environment variables `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`).

#### Step 2: Start Spring Boot Backend
In Windows PowerShell:
```powershell
cd voicelink\backend
.\mvnw.cmd spring-boot:run
```
Or on Linux/macOS:
```bash
cd voicelink/backend
./mvnw spring-boot:run
```
The backend starts at `http://localhost:8080`. Flyway automatically creates the database schema on boot.

#### Step 3: Build or Serve Frontend
```bash
cd voicelink/frontend
npm install

# For production extension build:
npm run build

# Or for local browser development with hot-reload:
npm start
```

---

## 6. How to Load the Extension in Google Chrome

1. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
2. Enable **Developer mode** using the toggle in the upper-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the directory:
   ```
   voicelink/frontend/dist/voicelink-extension
   ```
5. The **VoiceLink** icon will appear in your Chrome toolbar. Pin it for easy access!

---

## 7. How to Test Voice Calls & Chat Between Two Users

You can test the entire flow using two different Chrome windows (e.g., standard window and an **Incognito** window, or two separate Chrome profiles):

### Step 1: Register User A (Alice)
1. Open the VoiceLink extension popup in your main Chrome window.
2. Click the **Register** tab.
3. Fill in:
   - **Username**: `alice`
   - **Display Name**: `Alice In Chains`
   - **Email**: `alice@example.com`
   - **Password**: `Password123!`
4. Click **Create Account**. Alice is now logged in and marked **Online**.

### Step 2: Register User B (Bob)
1. Open a second Chrome window (or an Incognito window with "Allow in Incognito" enabled for VoiceLink, or another profile).
2. Open the VoiceLink extension popup.
3. Click the **Register** tab.
4. Fill in:
   - **Username**: `bob`
   - **Display Name**: `Bob Dylan`
   - **Email**: `bob@example.com`
   - **Password**: `Password123!`
5. Click **Create Account**. Bob is now logged in.

### Step 3: Search & Add Contact
1. In Alice's window, type `bob` in the search bar.
2. Click **+ Add**.
3. In Bob's window, a **Pending Requests** banner appears instantly via WebSocket.
4. Bob clicks **Accept**. Both users now see each other in their **Contacts** list with a green **Online** status dot!

### Step 4: Test Real-Time Chat
1. In Alice's contact list, click the **Chat** icon next to Bob.
2. Type `Hello Bob! How are you?` and press **Enter**.
3. Bob immediately receives the message in real-time.
4. Bob replies `Working smoothly!`. The conversation is persisted in PostgreSQL.

### Step 5: Test WebRTC Voice Calling
1. In Alice's window, click the **Voice Call** phone icon next to Bob.
2. In Bob's window:
   - An incoming call chime plays via Web Audio API.
   - An **Incoming Call** modal appears with Alice's avatar and name.
3. Bob clicks the green **Accept** button.
4. Both browsers negotiate WebRTC peer connections (SDP Offer/Answer + ICE Candidates) via Spring Boot STOMP signaling.
5. Microphones are captured, and peer-to-peer audio streams flow directly between the browsers.
6. Test controls:
   - Click the **Mute** button (icon changes to red slashed mic and local audio track is disabled).
   - Click **Popout Window** to keep the call alive in a dedicated compact window while clicking other tabs.
   - Click the red **Hang Up** button. Both sides terminate the call, tracks stop, and the duration is recorded in **Call History**.

---

## 8. Executing Tests

### Backend Unit & Integration Tests
To execute the comprehensive test suite (covering `AuthService`, `CallService` state machine transitions, `SignalingService` authorization, and `ChatService` idempotency):

```powershell
cd voicelink\backend
.\mvnw.cmd test
```

Results: **19 tests run, 0 failures, 0 errors, 100% passing.**

---

## 9. Comprehensive Documentation Index

Additional in-depth technical documentation is available in the [`docs/`](file:///./docs/) directory:

- [System Architecture](file:///./docs/architecture.md): Monorepo structure, component responsibilities, and media isolation design.
- [Signaling Protocol](file:///./docs/signaling-protocol.md): Typed STOMP signaling specification, Offer/Answer sequence diagram, and participant validation rules.
- [Call State Machine](file:///./docs/call-state-machine.md): Finite state machine, transition table, and timeout enforcement.
- [Relational Data Model](file:///./docs/data-model.md): PostgreSQL schema, entity definitions, indexes, and Mermaid ER diagram.
- [Security & Threat Model](file:///./docs/security.md): JWT lifecycle, WebSocket auth interceptor, personation protection, and Chrome MV3 CSP.
- [Deployment & Coturn](file:///./docs/deployment.md): Docker Compose setup, TURN configuration, and horizontal scaling.
- [Troubleshooting Guide](file:///./docs/troubleshooting.md): Common WebRTC NAT issues, audio permissions, autoplay policies, and extension lifecycle.

---

## 10. Known Limitations & Architectural Notes

1. **Manifest V3 Popup Lifecycle**: In Google Chrome, standard extension popups are closed by the browser when the user clicks anywhere outside the popup. To prevent voice calls from dropping, VoiceLink implements a 1-click **Dedicated Call Window** (`chrome.windows.create({ type: 'popup' })`), which persists independently across browsing sessions.
2. **Symmetric NATs / Strict Enterprise Firewalls**: Direct P2P audio requires STUN/UDP connectivity. In restrictive corporate networks, the included Coturn TURN server must be configured with an external public IP and ports.
3. **Audio Transcoding**: WebRTC standardizes on the Opus codec (48kHz). No audio is transcoded or handled on the Spring Boot server.
