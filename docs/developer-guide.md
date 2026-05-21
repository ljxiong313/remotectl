# RemoteCtl 开发者指南

本文档面向开发者，介绍如何参与 RemoteCtl 项目的开发、调试和扩展。

## 目录

- [开发环境搭建](#开发环境搭建)
- [项目结构](#项目结构)
- [核心模块说明](#核心模块说明)
- [开发流程](#开发流程)
- [调试技巧](#调试技巧)
- [代码规范](#代码规范)
- [扩展开发](#扩展开发)

---

## 开发环境搭建

### 前置要求

| 工具 | 版本要求 | 用途 |
|------|----------|------|
| Go | >= 1.19 | Agent 和 Server 开发 |
| Node.js | >= 18.x | Web Client 开发 |
| pnpm | >= 8.x | 前端包管理 |
| Flutter | >= 3.10 | Desktop App 开发 |
| Docker | >= 20.x | 容器化部署测试 |
| Make | 任意 | 构建脚本执行 |

### 克隆项目

```bash
git clone https://github.com/ljxiong313/remotectl.git
cd remotectl
```

### 初始化各模块

#### Server (Go)

```bash
cd server
go mod download
go mod tidy
```

#### Agent (Go)

```bash
cd agent
go mod download
go mod tidy
```

#### Web Client (Vue3 + TypeScript)

```bash
cd web
pnpm install
```

#### Desktop App (Flutter)

```bash
cd desktop
flutter pub get
```

### IDE 配置推荐

#### Go 开发 (GoLand / VS Code)

**VS Code 扩展：**
- Go
- gopls
- Go Nightly

**settings.json 配置：**
```json
{
  "go.useLanguageServer": true,
  "go.lintTool": "golangci-lint",
  "go.lintOnSave": "package",
  "[go]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  }
}
```

#### 前端开发 (VS Code)

**推荐扩展：**
- Vue - Official
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier

#### Flutter 开发 (Android Studio / VS Code)

**VS Code 扩展：**
- Flutter
- Dart

---

## 项目结构

```
remotectl/
├── agent/                    # 被控端 Agent
│   ├── cmd/                  # 入口命令
│   │   └── main.go
│   ├── internal/             # 内部模块
│   │   ├── capture/          # 屏幕捕获
│   │   ├── encoder/          # 视频编码
│   │   ├── webrtc/           # WebRTC 管理
│   │   ├── signal/           # 信令客户端
│   │   └── input/            # 输入事件处理
│   ├── pkg/                  # 可导出包
│   ├── configs/              # 配置文件
│   ├── go.mod
│   └── Makefile
│
├── server/                   # 信令服务器
│   ├── cmd/                  # 入口命令
│   │   └── main.go
│   ├── internal/             # 内部模块
│   │   ├── handler/          # WebSocket 处理器
│   │   ├── room/             # 房间管理
│   │   ├── auth/             # 认证模块
│   │   └── middleware/       # 中间件
│   ├── pkg/                  # 可导出包
│   ├── configs/              # 配置文件
│   ├── go.mod
│   └── Makefile
│
├── web/                      # Web 控制端
│   ├── src/
│   │   ├── views/            # 页面组件
│   │   ├── components/       # 通用组件
│   │   ├── stores/           # Pinia 状态管理
│   │   ├── utils/            # 工具函数
│   │   ├── webrtc/           # WebRTC 客户端
│   │   └── api/              # API 接口
│   ├── public/               # 静态资源
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── desktop/                  # 桌面应用
│   ├── lib/                  # Dart 库
│   │   ├── screens/          # 屏幕模块
│   │   ├── webrtc/           # WebRTC 封装
│   │   └── utils/            # 工具类
│   ├── windows/              # Windows 平台代码
│   ├── macos/                # macOS 平台代码
│   ├── linux/                # Linux 平台代码
│   ├── pubspec.yaml
│   └── lib/main.dart
│
├── docs/                     # 文档
│   ├── architecture.md       # 架构设计
│   ├── user-guide.md         # 用户手册
│   ├── developer-guide.md    # 开发者指南
│   ├── deployment-guide.md   # 部署指南
│   └── api.md                # API 文档
│
├── scripts/                  # 构建脚本
│   ├── build.sh              # 统一构建
│   └── release.sh            # 发布脚本
│
├── docker/                   # Docker 配置
│   ├── Dockerfile.server
│   ├── Dockerfile.agent
│   └── docker-compose.yml
│
├── README.md                 # 中文说明
├── README.en.md              # 英文说明
└── Makefile                  # 根构建脚本
```

---

## 核心模块说明

### 1. 屏幕捕获模块 (agent/internal/capture)

负责捕获被控端的屏幕画面。

```go
// capture/screen.go
package capture

// ScreenCapture 屏幕捕获接口
type ScreenCapture interface {
    // Start 开始捕获
    Start() error
    // Stop 停止捕获
    Stop()
    // GetFrame 获取一帧图像
    GetFrame() (*Frame, error)
    // GetDisplayList 获取显示器列表
    GetDisplayList() ([]Display, error)
}

// Frame 图像帧
type Frame struct {
    Data     []byte
    Width    int
    Height   int
    Format   string // "rgba", "yuv420p", etc.
    Timestamp int64
}
```

**平台实现：**
- **macOS**: 使用 CGDisplayStream API
- **Windows**: 使用 DXGI Desktop Duplication
- **Linux**: 使用 X11/XRandr 或 PipeWire

### 2. 视频编码模块 (agent/internal/encoder)

将捕获的帧编码为 H.264/H.265 格式。

```go
// encoder/encoder.go
package encoder

// VideoEncoder 视频编码器接口
type VideoEncoder interface {
    // Encode 编码一帧
    Encode(frame *capture.Frame) ([]byte, error)
    // SetBitRate 设置码率
    SetBitRate(bitrate int)
    // SetKeyFrameInterval 设置关键帧间隔
    SetKeyFrameInterval(interval int)
    // Close 关闭编码器
    Close()
}

// EncoderConfig 编码器配置
type EncoderConfig struct {
    Codec       string // "h264", "h265"
    Width       int
    Height      int
    BitRate     int    // bps
    FrameRate   int
    HardwareAccel bool  // 是否启用硬件加速
}
```

### 3. WebRTC 模块 (agent/internal/webrtc)

管理 WebRTC 连接和数据通道。

```go
// webrtc/manager.go
package webrtc

// WebRTCManager WebRTC 管理器
type WebRTCManager struct {
    peerConnection *webrtc.PeerConnection
    videoTrack     *webrtc.TrackLocalStaticSample
    dataChannel    *webrtc.DataChannel
    config         *Config
}

// NewWebRTCManager 创建管理器
func NewWebRTCManager(config *Config) (*WebRTCManager, error) {
    // 创建 PeerConnection
    // 配置 ICE Servers
    // 设置回调
}

// SetRemoteDescription 设置远端 SDP
func (m *WebRTCManager) SetRemoteDescription(sdp webrtc.SessionDescription) error

// CreateAnswer 创建 Answer
func (m *WebRTCManager) CreateAnswer() (webrtc.SessionDescription, error)

// SendVideo 发送视频数据
func (m *WebRTCManager) SendVideo(data []byte) error

// OnDataChannelMessage 注册数据通道消息回调
func (m *WebRTCManager) OnDataChannelMessage(handler func(msg []byte))
```

### 4. 信令模块 (agent/internal/signal)

与信令服务器通信。

```go
// signal/client.go
package signal

// Client 信令客户端
type Client struct {
    conn        *websocket.Conn
    roomID      string
    deviceID    string
    onOffer     func(sdp string)
    onCandidate func(candidate string)
}

// Connect 连接信令服务器
func (c *Client) Connect(serverURL string) error

// JoinRoom 加入房间
func (c *Client) JoinRoom(roomID string) error

// SendAnswer 发送 Answer SDP
func (c *Client) SendAnswer(sdp string) error

// SendCandidate 发送 ICE Candidate
func (c *Client) SendCandidate(candidate string) error
```

### 5. 输入事件处理 (agent/internal/input)

处理来自控制端的鼠标和键盘事件。

```go
// input/handler.go
package input

// InputHandler 输入处理器
type InputHandler interface {
    HandleMouseEvent(event *MouseEvent) error
    HandleKeyboardEvent(event *KeyboardEvent) error
}

// MouseEvent 鼠标事件
type MouseEvent struct {
    Type     string // "move", "click", "scroll"
    X        float64
    Y        float64
    Button   int    // 0: left, 1: middle, 2: right
    DeltaX   float64
    DeltaY   float64
}

// KeyboardEvent 键盘事件
type KeyboardEvent struct {
    Type      string // "down", "up"
    Key       string
    Code      string
    AltKey    bool
    CtrlKey   bool
    ShiftKey  bool
    MetaKey   bool
}
```

---

## 开发流程

### 分支管理

```
main        # 主分支，稳定版本
├── develop # 开发分支
│   ├── feature/xxx  # 功能分支
│   ├── fix/xxx      # 修复分支
│   └── refactor/xxx # 重构分支
└── release/x.x.x    # 发布分支
```

### 开发步骤

1. **创建功能分支**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **开发和测试**
   ```bash
   # 编写代码
   # 运行测试
   make test
   
   # 本地验证
   make run-agent
   make run-server
   ```

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

4. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 等待 CI 通过
   - 代码审查通过后合并

### Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

示例：
```
feat(agent): add hardware encoding support for macOS
fix(server): resolve websocket connection leak
docs(README): update installation instructions
```

---

## 调试技巧

### Go 调试

#### 使用 Delve

```bash
# 安装 Delve
go install github.com/go-delve/delve/cmd/dlv@latest

# 调试 Agent
cd agent
dlv debug ./cmd/main.go -- --config configs/agent.yaml

# 常用命令
# break main.main        - 设置断点
# continue               - 继续执行
# next                   - 单步执行
# print var              - 打印变量
# goroutines             - 查看所有 goroutine
```

#### 日志调试

```go
import "log"

// 使用不同日志级别
log.Printf("[DEBUG] WebRTC state: %v", state)
log.Printf("[INFO] Client connected: %s", clientID)
log.Printf("[ERROR] Failed to encode: %v", err)
```

### 前端调试

#### Vue Devtools

安装 Vue Devtools 浏览器扩展，可以：
- 查看组件树
- 检查 Pinia 状态
- 追踪事件

#### WebRTC 调试

Chrome 地址栏输入：
```
chrome://webrtc-internals
```

可以查看：
- SDP 信息
- ICE Candidate
- 连接状态
- 统计数据

### Flutter 调试

```bash
# 运行调试模式
flutter run --debug

# 查看日志
flutter logs

# 性能分析
flutter run --profile
```

---

## 代码规范

### Go 代码规范

遵循 [Effective Go](https://golang.org/doc/effective_go) 和 [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)。

**关键点：**
- 使用 `gofmt` 格式化代码
- 使用 `golint` 检查代码
- 错误处理不要忽略
- 接口命名使用 `-er` 后缀
- 导出的函数/类型必须添加注释

```go
// 正确示例
// CaptureScreen captures the current screen and returns the image data.
func CaptureScreen(displayID int) ([]byte, error) {
    // ...
}

// 错误示例 - 忽略错误
data, _ := os.ReadFile("config.yaml") // 不要这样做
```

### TypeScript 代码规范

遵循项目中的 ESLint 配置。

**关键点：**
- 使用 TypeScript 严格模式
- 优先使用 `const`，必要时使用 `let`
- 使用 async/await 替代回调
- 组件使用 PascalCase 命名
- 函数/变量使用 camelCase 命名

```typescript
// 正确示例
const connectToServer = async (serverUrl: string): Promise<void> => {
  try {
    const ws = new WebSocket(serverUrl);
    await waitForConnection(ws);
    console.log('Connected');
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

### Dart 代码规范

遵循 [Effective Dart](https://dart.dev/guides/language/effective-dart)。

**关键点：**
- 使用 `dart format` 格式化
- 使用 `dart analyze` 静态分析
- 库命名使用 snake_case
- 类型命名使用 PascalCase
- 成员命名使用 camelCase

---

## 扩展开发

### 添加新的视频编码器

1. 在 `agent/internal/encoder` 中创建新文件：

```go
// encoder/custom_encoder.go
package encoder

type CustomEncoder struct {
    config *EncoderConfig
}

func NewCustomEncoder(config *EncoderConfig) (*CustomEncoder, error) {
    // 初始化编码器
    return &CustomEncoder{config: config}, nil
}

func (e *CustomEncoder) Encode(frame *capture.Frame) ([]byte, error) {
    // 实现编码逻辑
}

func (e *CustomEncoder) Close() {
    // 清理资源
}
```

2. 在工厂函数中注册：

```go
// encoder/factory.go
func NewEncoder(config *EncoderConfig) (VideoEncoder, error) {
    switch config.Codec {
    case "custom":
        return NewCustomEncoder(config)
    default:
        return NewH264Encoder(config)
    }
}
```

### 添加新的信令协议

1. 实现 `signal.SignalClient` 接口：

```go
// signal/custom_client.go
package signal

type CustomSignalClient struct {
    // ...
}

func (c *CustomSignalClient) Connect(url string) error {
    // 实现连接逻辑
}

func (c *CustomSignalClient) JoinRoom(roomID string) error {
    // 实现加入房间逻辑
}

// ... 实现其他接口方法
```

### 添加 Web 前端功能

1. 创建新组件：

```vue
<!-- src/components/NewFeature.vue -->
<template>
  <div class="new-feature">
    <!-- 模板内容 -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const data = ref<string>('');

onMounted(() => {
  // 初始化逻辑
});
</script>

<style scoped>
.new-feature {
  /* 样式 */
}
</style>
```

2. 在视图中使用：

```vue
<script setup lang="ts">
import NewFeature from '@/components/NewFeature.vue';
</script>

<template>
  <NewFeature />
</template>
```

### 添加平台特定的屏幕捕获

在 `agent/internal/capture` 中添加平台实现：

```go
// +build windows

package capture

type WindowsCapture struct {
    // Windows 特定字段
}

func NewWindowsCapture() *WindowsCapture {
    // 使用 DXGI Desktop Duplication
}
```

---

## 测试

### 单元测试

```bash
# Go 测试
cd agent && go test ./... -v
cd server && go test ./... -v

# 前端测试
cd web && pnpm test

# Flutter 测试
cd desktop && flutter test
```

### 集成测试

```bash
# 启动测试环境
docker-compose -f docker/docker-compose.test.yml up -d

# 运行集成测试
make test-integration
```

### 覆盖率报告

```bash
# Go 覆盖率
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# 前端覆盖率
pnpm test:coverage
```

---

## 发布流程

1. **更新版本号**
   - 更新各模块的版本文件
   - 更新 CHANGELOG.md

2. **构建发布包**
   ```bash
   make release VERSION=1.0.0
   ```

3. **创建 GitHub Release**
   ```bash
   gh release create v1.0.0 \
     --title "v1.0.0" \
     --notes-file CHANGELOG.md \
     ./dist/*
   ```

---

## 常见问题

### Q: 如何调试 WebRTC 连接问题？

A: 
1. 检查 ICE Candidate 是否正常交换
2. 查看 `chrome://webrtc-internals`
3. 确认 TURN 服务器配置正确
4. 检查防火墙/NAT 设置

### Q: 如何处理跨平台编译问题？

A: 使用交叉编译：
```bash
# Linux
GOOS=linux GOARCH=amd64 go build -o agent-linux ./cmd/main.go

# Windows
GOOS=windows GOARCH=amd64 go build -o agent-windows.exe ./cmd/main.go

# macOS
GOOS=darwin GOARCH=amd64 go build -o agent-macos ./cmd/main.go
GOOS=darwin GOARCH=arm64 go build -o agent-macos-arm64 ./cmd/main.go
```

### Q: 如何贡献代码？

A:
1. Fork 项目
2. 创建功能分支
3. 提交 PR
4. 等待代码审查

---

## 联系方式

- GitHub Issues: https://github.com/ljxiong313/remotectl/issues
- Pull Requests: https://github.com/ljxiong313/remotectl/pulls
