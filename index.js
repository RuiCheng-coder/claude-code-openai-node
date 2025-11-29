#!/usr/bin/env node

/**
 * Claude-to-OpenAI API 代理服务器 - Node.js 版本
 *
 * 这个服务器充当一个代理，将 Claude API 格式的请求转换为 OpenAI API 格式，
 * 然后将响应转换回 Claude 格式。它使得任何与 Claude API 兼容的客户端
 * 能够与支持 OpenAI API 格式的服务进行通信。
 *
 * 功能特性：
 * - 动态路由：无需修改代码即可将请求代理到任意 OpenAI 兼容的 API 端点
 * - 全功能 API 兼容：支持 Claude 的 /v1/messages 端点，包括流式和非流式响应
 * - Tool Calling 转换：自动将 Claude 的 tools 格式转换为 OpenAI 格式
 * - 支持环境变量配置
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  parsePathAndModel,
  convertClaudeToOpenAIRequest,
  convertOpenAIToClaudeResponse,
  createStreamTransformer,
  applyModelRedirection
} = require('./src/converter');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Anthropic-Version']
}));

app.use(express.json({ limit: '10mb' }));

// CORS 预检请求处理
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Anthropic-Version');
  res.status(200).send();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 主代理端点
app.post('*/v1/messages', async (req, res) => {
  try {
    const url = req.url;
    console.log(url)

    const apiKey = process.env.OPEN_AI_KEY || req.headers['x-api-key'];
    const claudeRequest = req.body;
    const modelName = parsePathAndModel(url);
    const targetBaseUrl = process.env.BASE_URL;

    if (!targetBaseUrl || !modelName) {
      return res.status(400).json({
        error: 'Could not determine target base URL or model name. Ensure the URL format is correct or fallback environment variables are set.'
      });
    }

    // 应用模型重定向
    const redirectedModelName = applyModelRedirection(modelName);
    console.log(`模型重定向: ${modelName} -> ${redirectedModelName}`);

    const target = {
      modelName: redirectedModelName,
      baseUrl: targetBaseUrl,
      apiKey,
    };

    const openaiRequest = convertClaudeToOpenAIRequest(claudeRequest, target.modelName);

    // 转发请求到目标 API
    const openaiResponse = await fetch(`${target.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${target.apiKey}`,
      },
      body: JSON.stringify(openaiRequest),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      return res.status(openaiResponse.status).send(errorBody);
    }

    if (claudeRequest.stream) {
      // 流式响应处理
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, Anthropic-Version'
      });

      const transformer = createStreamTransformer(claudeRequest.model);
      const reader = openaiResponse.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const transformedChunks = transformer(value);
          for await (const chunk of transformedChunks) {
            res.write(chunk);
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
      } finally {
        res.end();
      }
    } else {
      // 非流式响应处理
      const openaiResponseData = await openaiResponse.json();
      const claudeResponse = convertOpenAIToClaudeResponse(openaiResponseData, claudeRequest.model);

      res.json(claudeResponse);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found. Only /v1/messages endpoint is supported' });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Claude Proxy Server is running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/your model name or 'defult'/<protocol>/<host>/<path>/<model>/v1/messages`);
});

module.exports = app;