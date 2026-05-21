# RemoteCtl

[English](README.en.md) | 简体中文

<p align="center">
  <img src="docs/images/logo.png" alt="RemoteCtl Logo" width="200">
</p>

<p align="center">
  <strong>基于 WebRTC 的跨平台远程桌面控制工具</strong>
</p>

<p align="center">
  <a href="#特性">特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#部署">部署</a> •
  <a href="#开发">开发</a> •
  <a href="#文档">文档</a>
</p>

---

## 简介

RemoteCtl 是一款开源的跨平台远程桌面控制工具，采用 WebRTC 技术实现端到端的视频流传输。支持浏览器和原生应用两种控制方式，让您可以随时随地远程控制您的电脑。

### 核心优势

| 特性 | 说明 |
|------|------|
| 🌐 **浏览器控制** | 无需安装软件，通过浏览器即可远程控制 |
| 🔒 **端到端加密** | ECDH P-256 + AES-256-GCM 加密，确保数据安全 |
| ⚡ **低延迟** | P2P 直连传输，局域网延迟低于 50ms |
| 🖥️ **跨平台** | 支持 Windows、macOS、Linux、Android、iOS |
| 🏠 **私有部署** | 支持自建服务器，数据完全自主可控 |
| 🎬 **硬件编码** | H.264 硬件加速，降低 CPU 占用 |

---

## 特性

### 远程控制功能
- ✅ 实时屏幕共享（支持多显示器）
- ✅ 鼠标键盘控制
- ✅ 剪贴板同步（支持中文、Emoji）
- ✅ 文件传输（双向）
- ✅ 会话内聊天

### 技术特性
- ✅ WebRTC P2P 视频传输
- ✅ H.264 硬件编码（VideoToolbox/x264）
- ✅ TURN 中继支持（4G/对称NAT）
- ✅ E2EE 端到端加密
- ✅ 自定义码率/帧率/分辨率

### 平台支持

| 平台 | 控制端 | 被控端 |
|------|:------:|:------:|
| Windows | ✅ | ✅ |
| macOS | ✅ | ✅ |
| Linux | ✅ | ✅ |
| Android | ✅ App | ❌ |
| iOS | ✅ App | ❌ |
| 浏览器 | ✅ | ❌ |

---

## 快速开始

### 方式一：使用官方服务（演示）

1. 访问 [演示地址](https://remotectl.example.com)
2. 在被控端下载并运行 Agent
3. 在控制端输入设备 ID 和密码

### 方式二：私有部署（推荐）

#### 1. 部署信令服务器

```bash
# 克隆仓库
git clone https://github.com/ljxiong313/remotectl.git
cd remotectl/server

# 编译
go build -o remotectl-server .

# 配置
cp server.yaml.example server.yaml
vim server.yaml

# 运行
./remotectl-server --config server.yaml
```

#### 2. 部署 TURN 服务器

```bash
# 安装 coturn
sudo apt install -y coturn

# 配置 /etc/turnserver.conf
listening-port=3478
external-ip=YOUR_PUBLIC_IP
realm=your-domain.com
lt-cred-mech
user=remotectl:your-password

# 启动
sudo systemctl enable --now coturn
```

#### 3. 安装被控端 Agent

```bash
# 下载 Agent
wget https://github.com/ljxiong313/remotectl/releases/download/v1.0.0/remotectl-agent-linux-amd64.tar.gz
tar xzf remotectl-agent-linux-amd64.tar.gz

# 配置
cp agent.yaml.example agent.yaml
vim agent.yaml  # 填写服务器地址

# 运行
./remotectl-agent --config agent.yaml
```

#### 4. 开始远程控制

打开浏览器访问您的服务器地址，输入被控端的设备 ID 和会话密码即可连接。

---

## 部署

详细部署指南请参考：[部署文档](docs/deployment-guide.md)

### 服务器要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 1 核 | 2 核+ |
| 内存 | 1 GB | 2 GB+ |
| 带宽 | 5 Mbps | 10 Mbps+ |
| 系统 | Ubuntu 20.04 | Ubuntu 22.04 |

### 端口要求

| 端口 | 协议 | 用途 |
|------|------|------|
| 443 | TCP | HTTPS/WSS 信令 |
| 3478 | TCP/UDP | TURN STUN |
| 49152-65535 | UDP | TURN 中继 |

### 使用 systemd 管理服务

```bash
# 安装服务
sudo bash deploy/install.sh

# 管理服务
sudo systemctl start remotectl-server
sudo systemctl status remotectl-server
sudo systemctl restart remotectl-server
```

---

## 开发

### 技术栈

| 组件 | 语言/框架 | 版本要求 | 用途 |
|------|----------|----------|------|
| **Server** | Go | >= 1.26 | 信令服务器 |
| **Agent** | Go | >= 1.26 | 被控端程序 |
| **Web Client** | TypeScript + React | Node >= 18 | Web 控制端 |
| **Desktop App** | Dart + Flutter | >= 3.0.0 | 跨平台桌面应用 |

### 依赖库

**Go 后端依赖：**
- `github.com/pion/webrtc/v3` - WebRTC 实现
- `github.com/gorilla/websocket` - WebSocket 通信
- `github.com/kbinani/screenshot` - 屏幕捕获
- `golang.org/x/crypto` - 加密算法

**前端依赖：**
- `react` ^18.3.1 - UI 框架
- `react-router-dom` ^6.23.0 - 路由管理
- `vite` ^5.3.1 - 构建工具
- `typescript` ^5.4.5 - 类型系统

**Flutter 依赖：**
- `flutter_webrtc` ^0.11.7 - WebRTC 支持
- `web_socket_channel` ^3.0.2 - WebSocket 客户端
- `cryptography` ^2.7.0 - 端到端加密

### 环境要求

#### 必需环境

| 工具 | 版本 | 安装命令 |
|------|------|----------|
| Go | >= 1.26 | [官方下载](https://go.dev/dl/) |
| Node.js | >= 18.0 | `brew install node` 或 [官网](https://nodejs.org/) |
| npm | >= 9.0 | 随 Node.js 安装 |

#### 可选环境（用于完整构建）

| 工具 | 版本 | 用途 | 安装命令 |
|------|------|------|----------|
| Flutter | >= 3.0.0 | 桌面应用 | [官方文档](https://flutter.dev/docs/get-started/install) |
| Docker | >= 20.0 | 容器化部署 | `brew install docker` |
| mingw-w64 | 最新 | Windows 交叉编译(macOS) | `brew install mingw-w64` |
| musl-cross | 最新 | Linux 静态链接(macOS) | `brew install filosottile/musl-cross/musl-cross` |

#### 平台特定依赖

**macOS 构建 Agent：**
```bash
# 需要 Xcode Command Line Tools
xcode-select --install
```

**Windows 交叉编译（在 macOS/Linux 上）：**
```bash
# macOS
brew install mingw-w64

# 下载 Windows x264 库
make setup-x264-win
```

**Linux 构建 Agent：**
```bash
# Ubuntu/Debian
sudo apt install gcc libx264-dev libx11-dev libxext-dev

# CentOS/RHEL
sudo yum install gcc libx264-devel libX11-devel libXext-devel
```

### 项目结构

```
remotectl/
├── agent/           # 被控端 (Go)
│   ├── capture/     #   屏幕捕获
│   ├── input/       #   输入控制
│   ├── pipeline/    #   数据管道
│   └── session/     #   会话管理
├── server/          # 信令服务器 (Go)
├── client/          # Web 客户端 (Vue3/TypeScript)
├── app/             # 桌面应用 (Flutter)
├── deploy/          # 部署配置
└── docs/            # 文档
```

### 编译

#### 使用 Makefile（推荐）

```bash
# 初始化依赖
make tidy

# 完整构建（所有平台）
make all

# 分模块构建
make server          # 编译 Server（当前平台）
make server-all      # 编译 Server（所有平台）
make client          # 编译 Web Client
make agent-mac       # 编译 Agent (macOS)
make agent-linux     # 编译 Agent (Linux)
make agent-win       # 编译 Agent (Windows，需 mingw-w64)
```

#### 单独编译

```bash
# 编译 Server（当前平台）
cd server && go build -o remotectl-server .

# 编译 Agent
cd agent && go build -o remotectl-agent .

# 编译 Web Client
cd client && npm install && npm run build

# 编译桌面应用
cd app && flutter build linux   # Linux
cd app && flutter build macos    # macOS
cd app && flutter build windows   # Windows
```

#### 构建产物

构建产物位于 `deploy/bin/` 目录：

| 产物 | 说明 |
|------|------|
| `remotectl-server` | 信令服务器（当前平台） |
| `remotectl-server-*-arm64` | Server ARM64 版本 |
| `remotectl-server-*-amd64` | Server AMD64 版本 |
| `remotectl-agent-*` | Agent 各平台版本 |
| `remotectl-*.zip` | macOS 应用包 |
| `remotectl-*.tar.gz` | Linux 应用包 |

### 开发调试

```bash
# 生成 TLS 证书
make cert

# 启动 Server 开发模式
make dev-server

# 启动 Web Client 开发模式
make dev-client

# Docker 部署
make docker-build
make docker-up
```

### 运行测试

```bash
# Go 测试
go test ./...

# 前端测试
cd client && npm test
```

---

## 文档

- [架构设计文档](docs/architecture.md) - 系统架构、模块设计、数据流
- [使用手册](docs/user-guide.md) - 用户操作指南
- [开发指南](docs/developer-guide.md) - 开发者贡献指南
- [部署指南](docs/deployment-guide.md) - 服务器部署配置
- [API 文档](docs/api.md) - WebSocket 和 DataChannel 接口

---

## 与商业软件对比

| 功能 | RemoteCtl | 向日葵 | ToDesk |
|------|:---------:|:------:|:------:|
| 开源 | ✅ | ❌ | ❌ |
| 私有部署 | ✅ | ❌ | 企业版 |
| 浏览器控制 | ✅ | 专业版 | 专业版 |
| 端到端加密 | ✅ | - | - |
| 自定义服务器 | ✅ | ❌ | ❌ |
| 完全免费 | ✅ | 部分 | 部分 |

---

## 安全说明

### 数据加密
- 视频流和控制指令采用端到端加密（E2EE）
- 信令传输使用 TLS 加密
- 服务器不存储任何明文数据

### 隐私保护
- 服务器仅转发信令，不接触视频数据
- 聊天消息直接 P2P 传输
- 会话结束后，临时数据自动清除

### 安全建议
- 会话密码仅使用一次
- 定期更新到最新版本
- 启用防火墙限制端口访问

---

## 常见问题

**Q: 连接失败怎么办？**

A: 请检查：
1. 被控端是否在线
2. 设备 ID 和密码是否正确
3. 防火墙是否开放端口
4. TURN 服务器是否正常运行

**Q: 画面延迟很高？**

A: 建议：
1. 优先使用局域网连接
2. 降低画质设置（码率、帧率）
3. 检查网络带宽

**Q: 如何在移动网络使用？**

A: 移动网络需要配置 TURN 服务器，请参考 [部署指南](docs/deployment-guide.md)。

---

## 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md)。

### Pull Request 流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

## 致谢

- [pion/webrtc](https://github.com/pion/webrtc) - Go WebRTC 实现
- [coturn](https://github.com/coturn/coturn) - TURN 服务器
- [Flutter](https://flutter.dev) - 跨平台 UI 框架
- [Vue.js](https://vuejs.org) - 渐进式 JavaScript 框架

---

## 联系方式

- 问题反馈：[GitHub Issues](https://github.com/ljxiong313/remotectl/issues)
- 原项目：[bsh888/remotectl](https://github.com/bsh888/remotectl)

---

<p align="center">
  Made with ❤️ by the RemoteCtl Community
</p>
