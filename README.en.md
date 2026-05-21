# RemoteCtl

English | [简体中文](README.md)

<p align="center">
  <img src="docs/images/logo.png" alt="RemoteCtl Logo" width="200">
</p>

<p align="center">
  <strong>Cross-platform Remote Desktop Control based on WebRTC</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#development">Development</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## Introduction

RemoteCtl is an open-source cross-platform remote desktop control tool built with WebRTC technology for end-to-end video streaming. It supports both browser-based and native application control, allowing you to remotely control your computer from anywhere.

### Key Advantages

| Feature | Description |
|---------|-------------|
| 🌐 **Browser Control** | No installation required - control via web browser |
| 🔒 **End-to-End Encryption** | ECDH P-256 + AES-256-GCM encryption for data security |
| ⚡ **Low Latency** | P2P direct transmission, <50ms latency on LAN |
| 🖥️ **Cross-Platform** | Supports Windows, macOS, Linux, Android, iOS |
| 🏠 **Self-Hosted** | Deploy your own server for complete data control |
| 🎬 **Hardware Encoding** | H.264 hardware acceleration for lower CPU usage |

---

## Features

### Remote Control Capabilities
- ✅ Real-time screen sharing (multi-monitor support)
- ✅ Mouse and keyboard control
- ✅ Clipboard sync (supports CJK, Emoji)
- ✅ File transfer (bidirectional)
- ✅ In-session chat

### Technical Features
- ✅ WebRTC P2P video transmission
- ✅ H.264 hardware encoding (VideoToolbox/x264)
- ✅ TURN relay support (4G/symmetric NAT)
- ✅ E2EE end-to-end encryption
- ✅ Customizable bitrate/frame rate/resolution

### Platform Support

| Platform | Controller | Host |
|----------|:----------:|:----:|
| Windows | ✅ | ✅ |
| macOS | ✅ | ✅ |
| Linux | ✅ | ✅ |
| Android | ✅ App | ❌ |
| iOS | ✅ App | ❌ |
| Browser | ✅ | ❌ |

---

## Quick Start

### Option 1: Use Official Service (Demo)

1. Visit the [Demo Site](https://remotectl.example.com)
2. Download and run the Agent on the host machine
3. Enter the Device ID and password on the controller

### Option 2: Self-Hosted Deployment (Recommended)

#### 1. Deploy Signaling Server

```bash
# Clone repository
git clone https://github.com/ljxiong313/remotectl.git
cd remotectl/server

# Build
go build -o remotectl-server .

# Configure
cp server.yaml.example server.yaml
vim server.yaml

# Run
./remotectl-server --config server.yaml
```

#### 2. Deploy TURN Server

```bash
# Install coturn
sudo apt install -y coturn

# Configure /etc/turnserver.conf
listening-port=3478
external-ip=YOUR_PUBLIC_IP
realm=your-domain.com
lt-cred-mech
user=remotectl:your-password

# Start
sudo systemctl enable --now coturn
```

#### 3. Install Agent on Host Machine

```bash
# Download Agent
wget https://github.com/ljxiong313/remotectl/releases/download/v1.0.0/remotectl-agent-linux-amd64.tar.gz
tar xzf remotectl-agent-linux-amd64.tar.gz

# Configure
cp agent.yaml.example agent.yaml
vim agent.yaml  # Fill in server address

# Run
./remotectl-agent --config agent.yaml
```

#### 4. Start Remote Control

Open your browser and visit your server address, then enter the host's Device ID and session password to connect.

---

## Deployment

For detailed deployment instructions, see: [Deployment Guide](docs/deployment-guide.md)

### Server Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 1 Core | 2+ Cores |
| Memory | 1 GB | 2+ GB |
| Bandwidth | 5 Mbps | 10+ Mbps |
| OS | Ubuntu 20.04 | Ubuntu 22.04 |

### Port Requirements

| Port | Protocol | Purpose |
|------|----------|---------|
| 443 | TCP | HTTPS/WSS signaling |
| 3478 | TCP/UDP | TURN STUN |
| 49152-65535 | UDP | TURN relay |

### Manage Service with systemd

```bash
# Install service
sudo bash deploy/install.sh

# Manage service
sudo systemctl start remotectl-server
sudo systemctl status remotectl-server
sudo systemctl restart remotectl-server
```

---

## Development

### Requirements

- Go >= 1.20
- Node.js >= 18.0
- Flutter >= 3.0 (optional, for desktop app)

### Project Structure

```
remotectl/
├── agent/           # Host agent (Go)
│   ├── capture/     #   Screen capture
│   ├── input/       #   Input control
│   ├── pipeline/    #   Data pipeline
│   └── session/     #   Session management
├── server/          # Signaling server (Go)
├── client/          # Web client (Vue3/TypeScript)
├── app/             # Desktop app (Flutter)
├── deploy/          # Deployment configs
└── docs/            # Documentation
```

### Build

```bash
# Build Server
cd server && go build -o remotectl-server .

# Build Agent
cd agent && go build -o remotectl-agent .

# Build Web Client
cd client && npm install && npm run build

# Build Desktop App
cd app && flutter build linux
```

### Run Tests

```bash
# Go tests
go test ./...

# Frontend tests
cd client && npm test
```

---

## Documentation

- [Architecture Design](docs/architecture.md) - System architecture, module design, data flow
- [User Guide](docs/user-guide.md) - User operation manual
- [Developer Guide](docs/developer-guide.md) - Contribution guide
- [Deployment Guide](docs/deployment-guide.md) - Server deployment
- [API Reference](docs/api.md) - WebSocket and DataChannel interfaces

---

## Comparison with Commercial Software

| Feature | RemoteCtl | Sunlogin | ToDesk |
|---------|:---------:|:--------:|:------:|
| Open Source | ✅ | ❌ | ❌ |
| Self-Hosted | ✅ | ❌ | Enterprise |
| Browser Control | ✅ | Pro | Pro |
| End-to-End Encryption | ✅ | - | - |
| Custom Server | ✅ | ❌ | ❌ |
| Completely Free | ✅ | Partial | Partial |

---

## Security

### Data Encryption
- Video streams and control commands use end-to-end encryption (E2EE)
- Signaling transmission uses TLS encryption
- Server stores no plaintext data

### Privacy Protection
- Server only forwards signaling, never touches video data
- Chat messages transmitted directly via P2P
- Temporary data automatically cleared after session ends

### Security Recommendations
- Use session password only once
- Update to latest version regularly
- Enable firewall to restrict port access

---

## FAQ

**Q: Connection failed?**

A: Please check:
1. Is the host agent online?
2. Are Device ID and password correct?
3. Are firewall ports open?
4. Is TURN server running?

**Q: High latency?**

A: Recommendations:
1. Prefer LAN connection
2. Lower quality settings (bitrate, frame rate)
3. Check network bandwidth

**Q: How to use on mobile network?**

A: Mobile network requires TURN server configuration. See [Deployment Guide](docs/deployment-guide.md).

---

## Contributing

Contributions are welcome! Please see [Contributing Guide](CONTRIBUTING.md).

### Pull Request Process

1. Fork this repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [pion/webrtc](https://github.com/pion/webrtc) - Go WebRTC implementation
- [coturn](https://github.com/coturn/coturn) - TURN server
- [Flutter](https://flutter.dev) - Cross-platform UI framework
- [Vue.js](https://vuejs.org) - Progressive JavaScript framework

---

## Contact

- Issues: [GitHub Issues](https://github.com/ljxiong313/remotectl/issues)
- Original Project: [bsh888/remotectl](https://github.com/bsh888/remotectl)

---

<p align="center">
  Made with ❤️ by the RemoteCtl Community
</p>
