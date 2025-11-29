# Claude Code OpenAI Node - Node.js Express Version

[English](#english) | [中文](#中文)

---

<a name="english"></a>
# Claude Code OpenAI Node (English)

A Node.js Express server deployed locally or in the cloud that acts as a proxy between Claude API-compatible clients and OpenAI-compatible API services.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` file with your settings:
   ```env
   # Server Configuration
   PORT=8082
   NODE_ENV=development

   # Target OpenAI-compatible API URL
   BASE_URL=http://127.0.0.1:3000/v1

   # Model Redirection Configuration (JSON format)
   MODEL_REDIRECTIONS={"qwen3":"qwen3:8b","deepseek-r1":"deepseek-r1:8b"}

   # OpenAI API Key Configuration (if set, will be used preferentially), otherwise uses ANTHROPIC_API_KEY from Claude configuration
   OPEN_AI_KEY=your_openai_api_key_here
   ```

4. Start the server:
   ```bash
   npm run start
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 8082 | No |
| `NODE_ENV` | Environment mode | development | No |
| `BASE_URL` | Target OpenAI-compatible API URL | - | Yes |
| `OPEN_AI_KEY` | API key (highest priority), otherwise uses ANTHROPIC_API_KEY from Claude configuration | - | No |
| `MODEL_REDIRECTIONS` | Model name mappings (JSON) | {} | No |

### API Key Priority

The proxy uses the following priority for API keys:
1. `OPEN_AI_KEY` environment variable (highest priority)
2. `x-api-key` header from the request, which is the ANTHROPIC_API_KEY from Claude configuration

## 🔗 Usage

### URL Format

```
http://your-server-url/{model-name or 'default'}/{protocol}/{host}/{path}/{model}/v1/messages
```

**ANTHROPIC_BASE_URL Example:**
```
http://127.0.0.1:8082/deepseek-r1
```

**ANTHROPIC_API_KEY Example:**
```
sk-xxxxxxxxxxxxxxxxxxxx
```

### API Endpoints

#### Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Main Proxy Endpoint
```
POST */v1/messages
```

## 🔧 Advanced Features

### Model Redirection

Configure model name mappings in `MODEL_REDIRECTIONS` environment variable:

```json
{
  "claude-3-haiku": "gpt-3.5-turbo",
  "claude-3-sonnet": "gpt-4",
  "qwen3": "qwen3:8b"
}
```

### Tool Calling Conversion

Automatically converts between formats:
- **Claude Format**: `tools` array with function definitions
- **OpenAI Format**: `functions` array with function definitions

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t claude-proxy-server .
```

### Run Container
```bash
docker run -p 8082:8082 --env-file .env claude-proxy-server
```

### Docker Compose
Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  claude-proxy:
    build: .
    ports:
      - "8082:8082"
    env_file:
      - .env
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## 📋 API Reference

### Request Headers

| Header | Description | Required |
|--------|-------------|----------|
| `Content-Type` | Must be `application/json` | Yes |
| `x-api-key` | API key for target service | No* |
| `Anthropic-Version` | Claude API version | No |

*If `OPEN_AI_KEY` is not set in environment

### Response Format

The server returns responses in Claude API format:

```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [{"type": "text", "text": "Hello!"}],
  "model": "claude-3-haiku",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 10,
    "output_tokens": 5
  }
}
```

## 🔍 Testing

### Health Check
```bash
curl http://localhost:8082/health
```

### Proxy Test
```bash
curl -X POST http://localhost:8082/test-model/https/api.example.com/openai/v1/test-model/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "model": "test-model",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 🛠️ Development

### Project Structure

```
server/
├── index.js              # Express server main file
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
├── Dockerfile            # Docker configuration
└── src/
    └── converter.js      # API format conversion logic
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests (if available)

### Core Components

- **`index.js`**: Main Express server with routing and middleware
- **`src/converter.js`**: Handles format conversion between Claude and OpenAI APIs

## 📝 Troubleshooting

### Common Issues

1. **Port already in use**: Change `PORT` in `.env` file
2. **API key not working**: Check `OPEN_AI_KEY` or `x-api-key` header
3. **Target API unreachable**: Verify `BASE_URL` configuration
4. **Model not found**: Check model name in URL and target API compatibility

### Logs

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

---

<a name="中文"></a>
# Claude Code OpenAI Node (中文)

一个部署在本地或者云上 Node.js Express 服务器，充当 Claude API 兼容客户端和 OpenAI 兼容 API 服务之间的代理。

## 🚀 快速开始

### 前提条件
- Node.js 18+
- npm 或 yarn

### 安装

1. 安装依赖:
   ```bash
   npm install
   ```

2. 配置环境变量:
   ```bash
   cp .env.example .env
   ```

3. 编辑 `.env` 文件设置您的配置:
   ```env
   # 服务器配置
   PORT=8082
   NODE_ENV=development

   # 目标 OpenAI 兼容 API URL
   BASE_URL=http://127.0.0.1:3000/v1

   # 模型重定向配置 (JSON 格式)
   MODEL_REDIRECTIONS={"qwen3":"qwen3:8b","deepseek-r1":"deepseek-r1:8b"}

   # OpenAI API 密钥配置 (如果设置，将优先使用)，没有会使用claude 中配置的ANTHROPIC_API_KEY
   OPEN_AI_KEY=your_openai_api_key_here
   ```

4. 启动服务器:
   ```bash
   npm run start
   ```

## ⚙️ 配置

### 环境变量

| 变量 | 描述 | 默认值 | 必需 |
|------|------|--------|------|
| `PORT` | 服务器端口 | 8082 | 否 |
| `NODE_ENV` | 环境模式 | development | 否 |
| `BASE_URL` | 目标 OpenAI 兼容 API URL | - | 是 |
| `OPEN_AI_KEY` | API 密钥 (最高优先级)，没有会使用claude 中配置的ANTHROPIC_API_KEY | - | 否 |
| `MODEL_REDIRECTIONS` | 模型名称映射 (JSON) | {} | 否 |

### API 密钥优先级

代理使用以下优先级处理 API 密钥:
1. `OPEN_AI_KEY` 环境变量 (最高优先级)
2. 请求中的 `x-api-key` 头部，为claude 中配置的ANTHROPIC_API_KEY

## 🔗 使用方法

### URL 格式

```
http://your-server-url/{model-name or 'default'}/{protocol}/{host}/{path}/{model}/v1/messages
```

**ANTHROPIC_BASE_URL示例:**
```
http://127.0.0.1:8082/deepseek-r1
```

**ANTHROPIC_API_KEY示例:**
```
sk-xxxxxxxxxxxxxxxxxxxx
```

### API 端点

#### 健康检查
```
GET /health
```

响应:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 主要代理端点
```
POST */v1/messages
```

## 🔧 高级功能

### 模型重定向

在 `MODEL_REDIRECTIONS` 环境变量中配置模型名称映射:

```json
{
  "claude-3-haiku": "gpt-3.5-turbo",
  "claude-3-sonnet": "gpt-4",
  "qwen3": "qwen3:8b"
}
```

### 工具调用转换

自动在格式之间转换:
- **Claude 格式**: `tools` 数组包含函数定义
- **OpenAI 格式**: `functions` 数组包含函数定义


## 📋 API 参考

### 请求头部

| 头部 | 描述 | 必需 |
|------|------|------|
| `Content-Type` | 必须为 `application/json` | 是 |
| `x-api-key` | 目标服务的 API 密钥 | 否* |
| `Anthropic-Version` | Claude API 版本 | 否 |

*如果环境变量中没有设置 `OPEN_AI_KEY`

### 响应格式

服务器以 Claude API 格式返回响应:

```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [{"type": "text", "text": "你好！"}],
  "model": "claude-3-haiku",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 10,
    "output_tokens": 5
  }
}
```

## 🔍 测试

### 健康检查
```bash
curl http://localhost:8082/health
```

### 代理测试
```bash
curl -X POST http://localhost:8082/test-model/https/api.example.com/openai/v1/test-model/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "model": "test-model",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 🛠️ 开发

### 项目结构

```
server/
├── index.js              # Express 服务器主文件
├── package.json          # 依赖和脚本
├── .env.example          # 环境变量模板
├── Dockerfile            # Docker 配置
└── src/
    └── converter.js      # API 格式转换逻辑
```

### 可用脚本

- `npm start` - 启动生产服务器
- `npm run dev` - 启动开发服务器（自动重载）
- `npm test` - 运行测试（如果可用）

### 核心组件

- **`index.js`**: 主要的 Express 服务器，包含路由和中间件
- **`src/converter.js`**: 处理 Claude 和 OpenAI API 之间的格式转换

## 📝 故障排除

### 常见问题

1. **端口已被占用**: 在 `.env` 文件中更改 `PORT`
2. **API 密钥不工作**: 检查 `OPEN_AI_KEY` 或 `x-api-key` 头部
3. **目标 API 无法访问**: 验证 `BASE_URL` 配置
4. **模型未找到**: 检查 URL 中的模型名称和目标 API 兼容性

### 日志

通过设置启用调试日志:
```env
LOG_LEVEL=debug
```