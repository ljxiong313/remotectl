# RemoteCtl API 接口文档

本文档描述 RemoteCtl 各组件之间的通信接口。

## 目录

- [WebSocket 信令接口](#websocket-信令接口)
- [WebRTC 数据通道接口](#webrtc-数据通道接口)
- [HTTP API 接口](#http-api-接口)
- [错误码定义](#错误码定义)

---

## WebSocket 信令接口

信令服务器与客户端（Agent 和 Controller）之间通过 WebSocket 进行通信。

### 连接端点

```
ws(s)://server-host:port/ws
```

### 消息格式

所有消息使用 JSON 格式：

```typescript
interface Message {
  type: string;      // 消息类型
  payload: any;      // 消息载荷
  timestamp: number; // 时间戳 (毫秒)
}
```

### 消息类型

#### 1. 加入房间 (join)

客户端加入指定房间。

**请求：**
```json
{
  "type": "join",
  "payload": {
    "roomId": "room-123",
    "role": "agent",  // "agent" 或 "controller"
    "deviceId": "device-abc",
    "deviceName": "My PC",
    "token": "jwt-token"  // 可选，认证时需要
  },
  "timestamp": 1700000000000
}
```

**响应：**
```json
{
  "type": "join_ack",
  "payload": {
    "success": true,
    "roomId": "room-123",
    "peers": [
      {
        "deviceId": "device-xyz",
        "deviceName": "Controller",
        "role": "controller"
      }
    ]
  },
  "timestamp": 1700000000001
}
```

#### 2. 离开房间 (leave)

客户端离开房间。

**请求：**
```json
{
  "type": "leave",
  "payload": {
    "roomId": "room-123"
  },
  "timestamp": 1700000000000
}
```

#### 3. Offer SDP (offer)

Agent 发送 Offer SDP。

**请求：**
```json
{
  "type": "offer",
  "payload": {
    "roomId": "room-123",
    "targetDeviceId": "device-xyz",  // 目标控制器
    "sdp": "v=0\r\no=- 4611731400430084610 2 IN IP4 127.0.0.1..."
  },
  "timestamp": 1700000000000
}
```

#### 4. Answer SDP (answer)

Controller 发送 Answer SDP。

**请求：**
```json
{
  "type": "answer",
  "payload": {
    "roomId": "room-123",
    "targetDeviceId": "device-abc",  // 目标 Agent
    "sdp": "v=0\r\no=- 4611731400430084610 2 IN IP4 127.0.0.1..."
  },
  "timestamp": 1700000000000
}
```

#### 5. ICE Candidate (candidate)

交换 ICE Candidate。

**请求：**
```json
{
  "type": "candidate",
  "payload": {
    "roomId": "room-123",
    "targetDeviceId": "device-xyz",
    "candidate": {
      "candidate": "candidate:842163049 1 udp 1677729519 192.168.1.1 52681 typ srflx raddr 0.0.0.0 rport 0 generation 0 ufrag abc network-id 1",
      "sdpMid": "0",
      "sdpMLineIndex": 0
    }
  },
  "timestamp": 1700000000000
}
```

#### 6. 心跳 (ping/pong)

保持连接活跃。

**请求：**
```json
{
  "type": "ping",
  "payload": {},
  "timestamp": 1700000000000
}
```

**响应：**
```json
{
  "type": "pong",
  "payload": {},
  "timestamp": 1700000000001
}
```

#### 7. 错误消息 (error)

服务器返回错误。

**响应：**
```json
{
  "type": "error",
  "payload": {
    "code": 4001,
    "message": "Room not found"
  },
  "timestamp": 1700000000000
}
```

#### 8. 设备状态 (device_status)

通知设备状态变化。

**广播：**
```json
{
  "type": "device_status",
  "payload": {
    "deviceId": "device-abc",
    "status": "online",  // "online", "offline", "busy"
    "metadata": {
      "os": "linux",
      "resolution": "1920x1080",
      "fps": 30
    }
  },
  "timestamp": 1700000000000
}
```

---

## WebRTC 数据通道接口

WebRTC 建立后，通过 DataChannel 传输控制数据。

### DataChannel 配置

```typescript
const dataChannelOptions = {
  ordered: true,        // 保证顺序
  maxRetransmits: 3     // 最大重传次数
};
```

### 数据格式

所有数据使用 JSON 格式，带有类型标识：

```typescript
interface DataChannelMessage {
  type: string;
  data: any;
}
```

### 消息类型

#### 1. 鼠标事件 (mouse)

**Controller → Agent**

```json
{
  "type": "mouse",
  "data": {
    "action": "move",  // "move", "down", "up", "click", "dblclick", "scroll"
    "x": 100.5,        // 归一化坐标 (0-1)
    "y": 200.3,
    "button": 0,       // 0: 左键, 1: 中键, 2: 右键
    "deltaX": 0,       // 滚动偏移
    "deltaY": -10
  }
}
```

**坐标转换：**
```typescript
// Controller 发送归一化坐标
const normalizedX = event.clientX / screenWidth;
const normalizedY = event.clientY / screenHeight;

// Agent 转换为实际坐标
const actualX = normalizedX * displayWidth;
const actualY = normalizedY * displayHeight;
```

#### 2. 键盘事件 (keyboard)

**Controller → Agent**

```json
{
  "type": "keyboard",
  "data": {
    "action": "down",  // "down", "up"
    "key": "A",
    "code": "KeyA",
    "altKey": false,
    "ctrlKey": true,
    "shiftKey": false,
    "metaKey": false
  }
}
```

**特殊键映射：**

| Web Code | 系统键码 |
|----------|----------|
| Enter | Return |
| Backspace | Delete |
| Escape | Escape |
| ArrowUp | Up |
| ArrowDown | Down |
| ArrowLeft | Left |
| ArrowRight | Right |
| MetaLeft | Command/Win |

#### 3. 剪贴板同步 (clipboard)

**双向通信**

```json
{
  "type": "clipboard",
  "data": {
    "action": "copy",  // "copy", "paste"
    "format": "text/plain",  // MIME 类型
    "content": "base64-encoded-content"
  }
}
```

#### 4. 文件传输 (file)

**双向通信**

```json
{
  "type": "file",
  "data": {
    "action": "start",  // "start", "chunk", "end", "cancel"
    "transferId": "transfer-123",
    "fileName": "document.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "chunkIndex": 0,     // 分块索引
    "totalChunks": 10,
    "chunkData": "base64-encoded-chunk"
  }
}
```

#### 5. 显示器切换 (display)

**Controller → Agent**

```json
{
  "type": "display",
  "data": {
    "action": "switch",
    "displayId": 1  // 显示器索引
  }
}
```

#### 6. 分辨率变更 (resolution)

**Controller → Agent**

```json
{
  "type": "resolution",
  "data": {
    "action": "change",
    "width": 1920,
    "height": 1080
  }
}
```

#### 7. 性能统计 (stats)

**Agent → Controller**

```json
{
  "type": "stats",
  "data": {
    "fps": 28,
    "bitrate": 2000000,
    "latency": 50,  // ms
    "packetLoss": 0.01,
    "encoder": "h264",
    "hardwareAccel": true
  }
}
```

#### 8. 控制命令 (command)

**Controller → Agent**

```json
{
  "type": "command",
  "data": {
    "action": "screenshot",  // "screenshot", "restart", "shutdown"
    "params": {}
  }
}
```

**响应 (Agent → Controller)：**
```json
{
  "type": "command_result",
  "data": {
    "action": "screenshot",
    "success": true,
    "result": {
      "imageData": "base64-encoded-image"
    }
  }
}
```

---

## HTTP API 接口

信令服务器提供的 REST API。

### 基础 URL

```
http(s)://server-host:port/api/v1
```

### 认证

使用 JWT Token：

```
Authorization: Bearer <token>
```

### 接口列表

#### 1. 健康检查

```
GET /health
```

**响应：**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 86400
}
```

#### 2. 创建房间

```
POST /rooms
```

**请求：**
```json
{
  "name": "My Room",
  "password": "optional-password",
  "maxPeers": 10,
  "expireTime": 3600
}
```

**响应：**
```json
{
  "roomId": "room-123",
  "name": "My Room",
  "createdAt": "2024-01-01T00:00:00Z",
  "expireAt": "2024-01-01T01:00:00Z"
}
```

#### 3. 获取房间信息

```
GET /rooms/:roomId
```

**响应：**
```json
{
  "roomId": "room-123",
  "name": "My Room",
  "peers": [
    {
      "deviceId": "device-abc",
      "deviceName": "Agent PC",
      "role": "agent",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 4. 获取设备列表

```
GET /devices
```

**响应：**
```json
{
  "devices": [
    {
      "deviceId": "device-abc",
      "deviceName": "My PC",
      "status": "online",
      "os": "linux",
      "lastSeen": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 5. 获取统计信息

```
GET /stats
```

**响应：**
```json
{
  "connections": {
    "total": 100,
    "active": 42
  },
  "rooms": {
    "total": 50,
    "active": 15
  },
  "messages": {
    "total": 10000,
    "perMinute": 100
  },
  "bandwidth": {
    "inbound": 1048576,
    "outbound": 2097152
  }
}
```

#### 6. 生成访问 Token

```
POST /auth/token
```

**请求：**
```json
{
  "deviceId": "device-abc",
  "expireTime": 86400
}
```

**响应：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expireAt": "2024-01-02T00:00:00Z"
}
```

---

## 错误码定义

### WebSocket 错误码

| 错误码 | 说明 |
|--------|------|
| 4001 | 房间不存在 |
| 4002 | 房间已满 |
| 4003 | 房间密码错误 |
| 4004 | 设备未授权 |
| 4005 | Token 无效或过期 |
| 4006 | 消息格式错误 |
| 4007 | 目标设备不存在 |
| 4008 | 操作不允许 |

### HTTP 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

### 错误响应格式

```json
{
  "error": {
    "code": 4001,
    "message": "Room not found",
    "details": "The room 'room-123' does not exist or has expired"
  }
}
```

---

## 类型定义

### TypeScript 类型定义

```typescript
// 信令消息类型
type SignalMessageType = 
  | 'join' | 'join_ack' 
  | 'leave' 
  | 'offer' | 'answer' 
  | 'candidate' 
  | 'ping' | 'pong' 
  | 'error' 
  | 'device_status';

// 数据通道消息类型
type DataChannelMessageType = 
  | 'mouse' 
  | 'keyboard' 
  | 'clipboard' 
  | 'file' 
  | 'display' 
  | 'resolution' 
  | 'stats' 
  | 'command' 
  | 'command_result';

// 设备角色
type DeviceRole = 'agent' | 'controller';

// 设备状态
type DeviceStatus = 'online' | 'offline' | 'busy';

// 鼠标动作
type MouseAction = 'move' | 'down' | 'up' | 'click' | 'dblclick' | 'scroll';

// 键盘动作
type KeyboardAction = 'down' | 'up';

// 文件传输动作
type FileTransferAction = 'start' | 'chunk' | 'end' | 'cancel';

// 控制命令
type ControlCommand = 'screenshot' | 'restart' | 'shutdown';
```

### Go 类型定义

```go
// 信令消息
type SignalMessage struct {
    Type      string          `json:"type"`
    Payload   json.RawMessage `json:"payload"`
    Timestamp int64           `json:"timestamp"`
}

// 加入房间载荷
type JoinPayload struct {
    RoomID     string `json:"roomId"`
    Role       string `json:"role"`
    DeviceID   string `json:"deviceId"`
    DeviceName string `json:"deviceName"`
    Token      string `json:"token,omitempty"`
}

// ICE Candidate
type ICECandidate struct {
    Candidate     string `json:"candidate"`
    SDPMid        string `json:"sdpMid"`
    SDPMLineIndex int    `json:"sdpMLineIndex"`
}

// 鼠标事件
type MouseEvent struct {
    Action  string  `json:"action"`
    X       float64 `json:"x"`
    Y       float64 `json:"y"`
    Button  int     `json:"button"`
    DeltaX  float64 `json:"deltaX"`
    DeltaY  float64 `json:"deltaY"`
}

// 键盘事件
type KeyboardEvent struct {
    Action   string `json:"action"`
    Key      string `json:"key"`
    Code     string `json:"code"`
    AltKey   bool   `json:"altKey"`
    CtrlKey  bool   `json:"ctrlKey"`
    ShiftKey bool   `json:"shiftKey"`
    MetaKey  bool   `json:"metaKey"`
}
```

---

## 示例代码

### JavaScript/TypeScript 客户端

```typescript
// 连接信令服务器
const ws = new WebSocket('wss://server.com/ws');

ws.onopen = () => {
  // 加入房间
  ws.send(JSON.stringify({
    type: 'join',
    payload: {
      roomId: 'room-123',
      role: 'controller',
      deviceId: 'controller-xyz'
    },
    timestamp: Date.now()
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'join_ack':
      console.log('Joined room:', message.payload.roomId);
      break;
    case 'offer':
      // 处理 Offer SDP
      handleOffer(message.payload.sdp);
      break;
    case 'candidate':
      // 添加 ICE Candidate
      addIceCandidate(message.payload.candidate);
      break;
  }
};

// 发送鼠标事件
function sendMouseEvent(action: string, x: number, y: number) {
  dataChannel.send(JSON.stringify({
    type: 'mouse',
    data: { action, x, y, button: 0 }
  }));
}
```

### Go 客户端

```go
package main

import (
    "encoding/json"
    "log"
    "github.com/gorilla/websocket"
)

func main() {
    // 连接信令服务器
    conn, _, err := websocket.DefaultDialer.Dial("ws://server.com/ws", nil)
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    // 加入房间
    joinMsg := SignalMessage{
        Type: "join",
        Payload: mustMarshal(JoinPayload{
            RoomID:   "room-123",
            Role:     "agent",
            DeviceID: "agent-abc",
        }),
        Timestamp: time.Now().UnixMilli(),
    }
    conn.WriteJSON(joinMsg)

    // 读取消息
    for {
        var msg SignalMessage
        if err := conn.ReadJSON(&msg); err != nil {
            log.Println("Read error:", err)
            break
        }
        handleMessage(msg)
    }
}

func mustMarshal(v interface{}) json.RawMessage {
    data, _ := json.Marshal(v)
    return data
}
```

---

## 版本兼容性

| API 版本 | 协议版本 | 说明 |
|----------|----------|------|
| v1 | 1.0 | 当前稳定版本 |

### 协议扩展

新功能通过以下方式添加：
1. 新消息类型
2. 现有消息的新字段（向后兼容）
3. 新的 DataChannel

客户端应忽略未知字段和消息类型。
