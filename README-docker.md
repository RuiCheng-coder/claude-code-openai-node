# Claude Proxy Server - Docker 部署指南

## 项目概述

这是一个 Claude-to-OpenAI API 代理服务器，用于将 Claude API 格式的请求转换为 OpenAI API 格式。

## 快速开始

### 1. 环境配置

复制环境变量文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# OpenAI 兼容 API 的基础 URL
BASE_URL=http://your-openai-compatible-api.com/v1

# 模型重定向配置 (JSON 格式)
MODEL_REDIRECTIONS={"qwen3":"qwen3:8b","deepseek-r1":"deepseek-r1:8b"}

# OpenAI API 密钥 (可选)
# OPEN_AI_KEY=your_api_key_here
```

### 2. 生产环境部署

使用 Docker Compose 启动服务：
```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 3. 开发环境部署

使用开发配置启动服务：
```bash
# 使用开发配置启动
docker-compose -f docker-compose.dev.yml up -d

# 查看开发环境日志
docker-compose -f docker-compose.dev.yml logs -f
```

### 4. 直接使用 Docker

也可以直接使用 Docker 命令：
```bash
# 构建镜像
docker build -t claude-proxy-server .

# 运行容器
docker run -d \
  --name claude-proxy \
  -p 3000:3000 \
  --env-file .env \
  claude-proxy-server
```

## 健康检查

服务包含健康检查端点：
```bash
curl http://localhost:3000/health
```

## 使用说明

代理服务器启动后，可以通过以下格式访问：
```
POST http://localhost:3000/{model_name}/v1/messages
```

或者使用完整路径格式：
```
POST http://localhost:3000/{model_name}/{protocol}/{host}/{path}/{model}/v1/messages
```

## 网络配置

- 默认端口：3000
- 健康检查：`/health`
- 代理端点：`*/v1/messages`

## 故障排除

1. **检查容器状态**：
   ```bash
   docker-compose ps
   ```

2. **查看日志**：
   ```bash
   docker-compose logs claude-proxy
   ```

3. **验证环境变量**：
   ```bash
   docker-compose exec claude-proxy env
   ```

4. **健康检查**：
   ```bash
   curl http://localhost:3000/health
   ```