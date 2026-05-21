# RemoteCtl 部署指南

本文档详细介绍 RemoteCtl 各组件的部署方式和配置方法。

## 目录

- [部署架构](#部署架构)
- [环境要求](#环境要求)
- [信令服务器部署](#信令服务器部署)
- [Agent 部署](#agent-部署)
- [Web 客户端部署](#web-客户端部署)
- [TURN 服务器部署](#turn-服务器部署)
- [Docker 部署](#docker-部署)
- [生产环境配置](#生产环境配置)
- [监控与日志](#监控与日志)
- [故障排除](#故障排除)

---

## 部署架构

### 典型部署拓扑

```
                    ┌─────────────────┐
                    │   公网用户      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Nginx/CDN     │
                    │  (Web 静态资源) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────┐  ┌──────▼──────┐  ┌────▼────────┐
     │ 信令服务器   │  │ TURN 服务器 │  │  API 服务   │
     │  (WebSocket)│  │  (NAT穿透)  │  │  (可选)     │
     └────────┬────┘  └─────────────┘  └─────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│ Agent │ │ Agent │ │ Agent │
│ (被控)│ │ (被控)│ │ (被控)│
└───────┘ └───────┘ └───────┘
```

### 局域网部署

```
┌─────────────────────────────────────┐
│           局域网 (内网)              │
│                                     │
│  ┌──────────┐      ┌──────────┐    │
│  │ 信令服务器│◄────►│  Agent   │    │
│  └────┬─────┘      └──────────┘    │
│       │                            │
│  ┌────▼─────┐                       │
│  │ Web 客户端│                      │
│  │ (控制端) │                       │
│  └──────────┘                       │
└─────────────────────────────────────┘
```

---

## 环境要求

### 服务器要求

| 组件 | CPU | 内存 | 存储 | 网络 |
|------|-----|------|------|------|
| 信令服务器 | 2核+ | 2GB+ | 10GB+ | 公网IP |
| TURN 服务器 | 2核+ | 1GB+ | 5GB+ | 公网IP |
| Web 前端 | 1核 | 512MB | 1GB | CDN推荐 |

### 操作系统支持

| 系统 | 版本 | Agent | Server |
|------|------|-------|--------|
| Ubuntu | 20.04+ | ✅ | ✅ |
| Debian | 10+ | ✅ | ✅ |
| CentOS | 7+ | ✅ | ✅ |
| macOS | 10.15+ | ✅ | ✅ |
| Windows | 10/11 | ✅ | ✅ |

### 端口规划

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | Nginx | HTTP |
| 443 | Nginx | HTTPS |
| 8080 | 信令服务器 | WebSocket (可配置) |
| 3478 | TURN | STUN/TURN UDP |
| 5349 | TURN | STUN/TURN TLS |
| 49152-65535 | TURN | 中继端口范围 |

---

## 信令服务器部署

### 方式一：直接部署

#### 1. 安装 Go 环境

```bash
# Ubuntu/Debian
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz

# 配置环境变量
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
echo 'export GOPATH=$HOME/go' >> ~/.bashrc
source ~/.bashrc
```

#### 2. 编译服务器

```bash
cd server
go mod download
go build -o remotectl-server ./cmd/main.go
```

#### 3. 创建配置文件

```yaml
# configs/server.yaml
server:
  host: "0.0.0.0"
  port: 8080
  read_timeout: 30s
  write_timeout: 30s

websocket:
  path: "/ws"
  ping_interval: 30s
  pong_timeout: 60s

webrtc:
  ice_servers:
    - urls: ["stun:stun.l.google.com:19302"]
    - urls: ["turn:your-turn-server:3478"]
      username: "username"
      credential: "password"

auth:
  enabled: false
  secret: "your-jwt-secret"

log:
  level: "info"
  format: "json"
  output: "/var/log/remotectl/server.log"
```

#### 4. 运行服务器

```bash
./remotectl-server --config configs/server.yaml
```

### 方式二：Systemd 服务

创建服务文件：

```ini
# /etc/systemd/system/remotectl-server.service
[Unit]
Description=RemoteCtl Signaling Server
After=network.target

[Service]
Type=simple
User=remotectl
Group=remotectl
WorkingDirectory=/opt/remotectl/server
ExecStart=/opt/remotectl/server/remotectl-server --config configs/server.yaml
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

管理服务：

```bash
# 创建用户
sudo useradd -r -s /bin/false remotectl

# 创建目录
sudo mkdir -p /opt/remotectl/server
sudo cp remotectl-server /opt/remotectl/server/
sudo cp -r configs /opt/remotectl/server/
sudo chown -R remotectl:remotectl /opt/remotectl

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable remotectl-server
sudo systemctl start remotectl-server

# 查看状态
sudo systemctl status remotectl-server
```

---

## Agent 部署

### Linux 部署

#### 1. 编译 Agent

```bash
cd agent
go build -o remotectl-agent ./cmd/main.go
```

#### 2. 创建配置文件

```yaml
# configs/agent.yaml
agent:
  device_id: ""  # 留空自动生成
  device_name: "My Linux PC"

server:
  url: "wss://your-server.com/ws"
  reconnect_interval: 5s

capture:
  display: 0  # 显示器索引
  fps: 30
  format: "rgba"

encoder:
  codec: "h264"
  bitrate: 2000000  # 2Mbps
  hardware_accel: true

webrtc:
  ice_servers:
    - urls: ["stun:stun.l.google.com:19302"]

input:
  enabled: true

log:
  level: "info"
  output: "/var/log/remotectl/agent.log"
```

#### 3. Systemd 服务

```ini
# /etc/systemd/system/remotectl-agent.service
[Unit]
Description=RemoteCtl Agent
After=network.target

[Service]
Type=simple
User=remotectl
Group=remotectl
WorkingDirectory=/opt/remotectl/agent
ExecStart=/opt/remotectl/agent/remotectl-agent --config configs/agent.yaml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### macOS 部署

#### 1. 屏幕录制权限

首次运行需要授权屏幕录制权限：
- 系统偏好设置 → 安全性与隐私 → 隐私 → 屏幕录制
- 添加终端或应用

#### 2. 运行 Agent

```bash
./remotectl-agent --config configs/agent.yaml
```

#### 3. 创建 LaunchAgent (开机自启)

```xml
<!-- ~/Library/LaunchAgents/com.remotectl.agent.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.remotectl.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/remotectl/agent/remotectl-agent</string>
        <string>--config</string>
        <string>/opt/remotectl/agent/configs/agent.yaml</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

加载服务：
```bash
launchctl load ~/Library/LaunchAgents/com.remotectl.agent.plist
```

### Windows 部署

#### 1. 编译

```bash
GOOS=windows GOARCH=amd64 go build -o remotectl-agent.exe ./cmd/main.go
```

#### 2. 配置文件

```yaml
# configs/agent.yaml
agent:
  device_name: "My Windows PC"

server:
  url: "wss://your-server.com/ws"

capture:
  display: 0
  fps: 30

encoder:
  codec: "h264"
  hardware_accel: true  # 使用 NVIDIA/Intel 硬件編碼
```

#### 3. 创建 Windows 服务

使用 [NSSM](https://nssm.cc/)：

```powershell
# 下载 NSSM
# 安装服务
nssm install RemoteCtlAgent "C:\RemoteCtl\agent\remotectl-agent.exe" "--config" "C:\RemoteCtl\agent\configs\agent.yaml"
nssm start RemoteCtlAgent
```

---

## Web 客户端部署

### 构建

```bash
cd web
pnpm install
pnpm build
```

构建产物在 `dist/` 目录。

### Nginx 配置

```nginx
# /etc/nginx/sites-available/remotectl
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Web 静态资源
    location / {
        root /var/www/remotectl/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
}
```

### CDN 部署

将 `dist/` 目录部署到 CDN：
- 阿里云 OSS + CDN
- 腾讯云 COS + CDN
- Cloudflare Pages
- Vercel / Netlify

---

## TURN 服务器部署

### 使用 coturn

#### 1. 安装 coturn

```bash
# Ubuntu/Debian
sudo apt install coturn

# CentOS
sudo yum install coturn
```

#### 2. 配置文件

```bash
# /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349

# 监听 IP
listening-ip=YOUR_SERVER_IP
relay-ip=YOUR_SERVER_IP

# 外网 IP (NAT 环境)
external-ip=YOUR_PUBLIC_IP

# 认证
auth
static-auth-secret=your-secret-key

# TLS/DTLS
cert=/etc/ssl/certs/turn.pem
pkey=/etc/ssl/private/turn.key

# 中继端口范围
min-port=49152
max-port=65535

# 日志
log-file=/var/log/turnserver.log
verbose
```

#### 3. 生成 TLS 证书

```bash
# 使用 Let's Encrypt
sudo certbot certonly --standalone -d turn.your-domain.com

# 转换格式
sudo openssl pkcs12 -export -in /etc/letsencrypt/live/turn.your-domain.com/fullchain.pem \
    -inkey /etc/letsencrypt/live/turn.your-domain.com/privkey.pem \
    -out /etc/ssl/private/turn.p12 -name turn

sudo openssl pkcs12 -in /etc/ssl/private/turn.p12 -nokeys -out /etc/ssl/certs/turn.pem
sudo openssl pkcs12 -in /etc/ssl/private/turn.p12 -nocerts -nodes -out /etc/ssl/private/turn.key
```

#### 4. 启动服务

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

#### 5. 配置信令服务器

更新信令服务器配置：

```yaml
webrtc:
  ice_servers:
    - urls: ["stun:turn.your-domain.com:3478"]
    - urls: ["turn:turn.your-domain.com:3478"]
      username: "username"
      credential: "password"
    - urls: ["turns:turn.your-domain.com:5349"]
      username: "username"
      credential: "password"
```

---

## Docker 部署

### docker-compose.yml

```yaml
version: '3.8'

services:
  server:
    build:
      context: ./server
      dockerfile: ../docker/Dockerfile.server
    ports:
      - "8080:8080"
    volumes:
      - ./server/configs:/app/configs:ro
      - server-logs:/var/log/remotectl
    environment:
      - TZ=Asia/Shanghai
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  turn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478/udp"
      - "3478:3478/tcp"
      - "5349:5349/tcp"
      - "49152-65535:49152-65535/udp"
    command:
      - -n
      - --log-file=stdout
      - --listening-port=3478
      - --tls-listening-port=5349
      - --listening-ip=0.0.0.0
      - --external-ip=$EXTERNAL_IP
      - --auth
      - --static-auth-secret=$TURN_SECRET
    restart: unless-stopped

  web:
    build:
      context: ./web
      dockerfile: ../docker/Dockerfile.web
    ports:
      - "80:80"
    depends_on:
      - server
    restart: unless-stopped

volumes:
  server-logs:
```

### Dockerfile 示例

**Server:**
```dockerfile
# docker/Dockerfile.server
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o remotectl-server ./cmd/main.go

FROM alpine:3.18
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/remotectl-server .
COPY configs ./configs
EXPOSE 8080
CMD ["./remotectl-server", "--config", "configs/server.yaml"]
```

**Web:**
```dockerfile
# docker/Dockerfile.web
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 启动

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 生产环境配置

### 安全加固

#### 1. 启用 HTTPS

```bash
# 使用 Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 2. 配置防火墙

```bash
# UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw enable
```

#### 3. 启用认证

```yaml
# server/configs/server.yaml
auth:
  enabled: true
  secret: "your-secure-jwt-secret"
  token_expire: 24h
```

### 性能优化

#### 1. 系统参数调优

```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.ip_local_port_range = 1024 65535

# 应用
sudo sysctl -p
```

#### 2. Nginx 优化

```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 65535;

http {
    keepalive_timeout 65;
    keepalive_requests 1000;
    
    upstream websocket {
        server 127.0.0.1:8080;
        keepalive 32;
    }
}
```

#### 3. Go 运行时优化

```bash
# 设置 GOMAXPROCS
export GOMAXPROCS=$(nproc)

# 或在代码中
runtime.GOMAXPROCS(runtime.NumCPU())
```

---

## 监控与日志

### Prometheus 指标

服务器暴露 Prometheus 指标：

```
# HELP remotectl_connections_active 当前活跃连接数
# TYPE remotectl_connections_active gauge
remotectl_connections_active 42

# HELP remotectl_rooms_active 当前活跃房间数
# TYPE remotectl_rooms_active gauge
remotectl_rooms_active 15

# HELP remotectl_messages_total 消息总数
# TYPE remotectl_messages_total counter
remotectl_messages_total{type="offer"} 100
remotectl_messages_total{type="answer"} 100
```

### Grafana Dashboard

导入 Dashboard 监控：
- 连接数趋势
- 消息吞吐量
- 错误率
- 延迟分布

### 日志配置

```yaml
log:
  level: "info"  # debug, info, warn, error
  format: "json"  # json, text
  output: "/var/log/remotectl/server.log"
  max_size: 100  # MB
  max_backups: 10
  max_age: 30  # days
  compress: true
```

---

## 故障排除

### 常见问题

#### 1. WebSocket 连接失败

**症状：** 控制端无法连接到信令服务器

**排查：**
```bash
# 检查服务状态
sudo systemctl status remotectl-server

# 检查端口
netstat -tlnp | grep 8080

# 检查防火墙
sudo ufw status
```

**解决：**
- 确认服务正在运行
- 检查防火墙规则
- 确认 Nginx WebSocket 代理配置

#### 2. WebRTC 连接失败

**症状：** SDP 交换成功但无法建立媒体连接

**排查：**
- 检查 ICE Candidate 是否完整交换
- 查看 `chrome://webrtc-internals`
- 测试 TURN 服务器连通性

```bash
# 测试 TURN
turnutils_uclient -v -T -u username -w password turn.your-domain.com
```

#### 3. 屏幕捕获失败

**症状：** Agent 启动但无法捕获屏幕

**排查：**
- macOS: 检查屏幕录制权限
- Linux: 检查 X11 DISPLAY 环境变量
- Windows: 检查是否在会话 0

#### 4. 性能问题

**症状：** 视频卡顿、延迟高

**排查：**
```bash
# 检查 CPU 使用
top -p $(pgrep remotectl-agent)

# 检查网络延迟
ping your-server.com

# 检查编码器
# 查看是否使用硬件编码
```

**解决：**
- 降低分辨率/帧率
- 启用硬件编码
- 增加服务器带宽
- 优化 TURN 服务器位置

---

## 附录

### 配置模板

完整的配置模板可在 `configs/` 目录找到：
- `server.yaml.example`
- `agent.yaml.example`

### 版本升级

```bash
# 备份配置
cp -r configs configs.bak

# 下载新版本
wget https://github.com/ljxiong313/remotectl/releases/download/v1.0.0/remotectl-server-linux-amd64.tar.gz

# 解压并替换
tar -xzf remotectl-server-linux-amd64.tar.gz
sudo systemctl restart remotectl-server
```

### 卸载

```bash
# 停止服务
sudo systemctl stop remotectl-server remotectl-agent

# 禁用开机启动
sudo systemctl disable remotectl-server remotectl-agent

# 删除文件
sudo rm -rf /opt/remotectl
sudo rm /etc/systemd/system/remotectl-*.service
sudo systemctl daemon-reload
```
