# VoiceLink — Deployment & Scaling Guide

## 1. Local & Containerized Deployment

The entire system can be launched locally via Docker Compose:

```bash
# 1. Clone repository
git clone https://github.com/voicelink/voicelink.git
cd voicelink

# 2. Configure environment
cp .env.example .env

# 3. Start PostgreSQL, Spring Boot Backend, and Coturn TURN Server
docker-compose up -d --build
```

---

## 2. Coturn TURN Server Setup

WebRTC peer-to-peer audio works directly on most home and office networks via STUN. However, when both users are behind Symmetric NAT or restrictive corporate firewalls, direct connectivity is impossible and requires a TURN relay server.

### 2.1 Coturn Configuration (`infrastructure/coturn/turnserver.conf`)
- **Port**: 3478 (UDP/TCP)
- **Relay UDP Ports**: 49152 - 49160
- **Static Auth / Secret**: Set `user=voicelink:<your_secure_password>`

### 2.2 Production Domain & TLS
In a live cloud environment (e.g. AWS, GCP, DigitalOcean):
1. Point a DNS A record (e.g. `turn.voicelink.net`) to your public server IP.
2. Open UDP/TCP port 3478, and UDP range 49152-65535 on your firewall/security group.
3. Configure Coturn with Let's Encrypt certificates for TLS/DTLS:
   ```conf
   cert=/etc/letsencrypt/live/turn.voicelink.net/fullchain.pem
   pkey=/etc/letsencrypt/live/turn.voicelink.net/privkey.pem
   ```

---

## 3. Scaling Beyond a Single Instance

The initial deployment runs a single Spring Boot monolith. To scale horizontally to multiple backend instances:

1. **Distributed Presence**:
   - Replace in-memory `ConcurrentHashMap` presence tracking with Redis Sets (`SADD user:presence:<userId> <sessionId>`) with TTL and heartbeat refreshes.
2. **WebSocket Message Relay**:
   - Configure Spring STOMP with an external message broker (RabbitMQ with STOMP plugin or Redis Pub/Sub) via `enableStompBrokerRelay()`, so events for a user connected to Instance A can be published from Instance B.
3. **Database Load Balancing**:
   - Utilize PostgreSQL connection pooling (HikariCP) and read replicas for paginated chat and call history queries.
