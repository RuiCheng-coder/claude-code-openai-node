/**
 * Claude-to-OpenAI API 转换器
 *
 * 这个模块负责将 Claude API 格式转换为 OpenAI API 格式，
 * 以及将 OpenAI 响应转换回 Claude 格式。
 */

/**
 * 解析模型重定向配置
 * @returns {Object} 模型重定向映射对象
 */
function parseModelRedirections() {
  const redirections = process.env.MODEL_REDIRECTIONS;
  if (!redirections) {
    return {};
  }

  try {
    // 解析 JSON 格式的配置
    const mapping = JSON.parse(redirections);
    console.log('解析的模型重定向配置:', mapping);
    return mapping;
  } catch (error) {
    console.error('解析模型重定向配置失败:', error.message);
    console.log('配置内容:', redirections);
    return {};
  }
}

/**
 * 应用模型重定向
 * @param {string} modelName - 原始模型名称
 * @returns {string} 重定向后的模型名称
 */
function applyModelRedirection(modelName) {
  if (!modelName) return modelName;

  const redirections = parseModelRedirections();
  return redirections[modelName] || modelName;
}

/**
 * 解析路径和模型名称
 * @param {string} pathname - URL 路径名
 * @returns {string | null}
 */
function parsePathAndModel(pathname) {
  // 移除查询参数和强制后缀以隔离路径的动态部分
  const pathWithoutQuery = pathname.split('?')[0];
  const dynamicPath = pathWithoutQuery.substring(0, pathWithoutQuery.lastIndexOf('/v1/messages'));
  const parts = dynamicPath.split('/').filter(p => p);

  // 根据规则确定模型名称：当第一个部分为 default 时从最后部分获取，否则从第一个部分获取
  let modelName;
  if (parts[0].toLowerCase() === 'default') {
    modelName = parts.pop();
  } else {
    modelName = parts.shift();
  }
  return modelName;
}

/**
 * 递归清理 JSON Schema 以兼容目标 API（如 Google Gemini）
 * @param {any} schema - 要清理的 schema 对象
 */
function recursivelyCleanSchema(schema) {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(item => recursivelyCleanSchema(item));
  }

  const newSchema = {};
  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      if (key === '$schema' || key === 'additionalProperties') {
        continue;
      }
      newSchema[key] = recursivelyCleanSchema(schema[key]);
    }
  }

  if (newSchema.type === 'string' && newSchema.format) {
    const supportedFormats = ['date-time', 'enum'];
    if (!supportedFormats.includes(newSchema.format)) {
      delete newSchema.format;
    }
  }

  return newSchema;
}

/**
 * 将 Claude API 请求转换为 OpenAI 格式
 * @param {Object} claudeRequest - Claude 请求对象
 * @param {string} modelName - 目标模型名称
 * @returns {Object} OpenAI 请求对象
 */
function convertClaudeToOpenAIRequest(claudeRequest, modelName) {
  const openaiMessages = [];

  if (claudeRequest.system) {
    openaiMessages.push({ role: "system", content: claudeRequest.system });
  }

  for (let i = 0; i < claudeRequest.messages.length; i++) {
    const message = claudeRequest.messages[i];
    if (message.role === 'user') {
      if (Array.isArray(message.content)) {
        const toolResults = message.content.filter(c => c.type === 'tool_result');
        const otherContent = message.content.filter(c => c.type !== 'tool_result');

        if (toolResults.length > 0) {
          toolResults.forEach(block => {
            openaiMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
            });
          });
        }

        if (otherContent.length > 0) {
          openaiMessages.push({
            role: "user",
            content: otherContent.map(block =>
              block.type === 'text'
                ? { type: 'text', text: block.text }
                : { type: 'image_url', image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } }
            )
          });
        }
      } else {
        openaiMessages.push({ role: "user", content: message.content });
      }
    } else if (message.role === 'assistant') {
      const textParts = [];
      const toolCalls = [];
      if (Array.isArray(message.content)) {
        message.content.forEach(block => {
          if (block.type === 'text') {
            textParts.push(block.text);
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: { name: block.name, arguments: JSON.stringify(block.input || {}) },
            });
          }
        });
      }
      const assistantMessage = {
        role: 'assistant',
        content: textParts.join('\n') || null
      };
      if (toolCalls.length > 0) {
        assistantMessage.tool_calls = toolCalls;
      }
      openaiMessages.push(assistantMessage);
    }
  }

  // Validate and clamp max_tokens to valid range [1, 8192]
  const maxTokens = claudeRequest.max_tokens;
  const validatedMaxTokens = maxTokens ? Math.max(1, Math.min(8192, maxTokens)) : undefined;

  const openaiRequest = {
    model: modelName,
    messages: openaiMessages,
    max_tokens: validatedMaxTokens,
    temperature: claudeRequest.temperature,
    top_p: claudeRequest.top_p,
    stream: claudeRequest.stream,
    stop: claudeRequest.stop_sequences,
  };

  if (claudeRequest.tools) {
    openaiRequest.tools = claudeRequest.tools.map((tool) => {
      const cleanedParameters = recursivelyCleanSchema(tool.input_schema);
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: cleanedParameters,
        },
      };
    });
  }

  if (claudeRequest.tool_choice) {
    if (claudeRequest.tool_choice.type === 'auto' || claudeRequest.tool_choice.type === 'any') {
      openaiRequest.tool_choice = 'auto';
    } else if (claudeRequest.tool_choice.type === 'tool') {
      openaiRequest.tool_choice = {
        type: 'function',
        function: { name: claudeRequest.tool_choice.name }
      };
    }
  }

  return openaiRequest;
}

/**
 * 将非流式 OpenAI 响应转换为 Claude 格式
 * @param {Object} openaiResponse - OpenAI 响应对象
 * @param {string} model - 模型名称
 * @returns {Object} Claude 响应对象
 */
function convertOpenAIToClaudeResponse(openaiResponse, model) {
  const choice = openaiResponse.choices[0];
  const contentBlocks = [];

  if (choice.message.content) {
    contentBlocks.push({ type: 'text', text: choice.message.content });
  }

  if (choice.message.tool_calls) {
    choice.message.tool_calls.forEach((call) => {
      contentBlocks.push({
        type: 'tool_use',
        id: call.id,
        name: call.function.name,
        input: JSON.parse(call.function.arguments),
      });
    });
  }

  const stopReasonMap = {
    stop: "end_turn",
    length: "max_tokens",
    tool_calls: "tool_use"
  };

  return {
    id: openaiResponse.id,
    type: "message",
    role: "assistant",
    model: model,
    content: contentBlocks,
    stop_reason: stopReasonMap[choice.finish_reason] || "end_turn",
    usage: {
      input_tokens: openaiResponse.usage.prompt_tokens,
      output_tokens: openaiResponse.usage.completion_tokens,
    },
  };
}

/**
 * 流式响应转换器
 * @param {string} model - 模型名称
 * @returns {Function} 转换函数
 */
function createStreamTransformer(model) {
  let initialized = false;
  let buffer = "";
  const messageId = `msg_${Math.random().toString(36).substr(2, 9)}`;
  const toolCalls = {};
  let contentBlockIndex = 0;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const sendEvent = (event, data) => {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  return async function* (chunk) {
    if (!initialized) {
      yield sendEvent('message_start', {
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          model,
          content: [],
          stop_reason: null,
          usage: { input_tokens: 0, output_tokens: 0 }
        }
      });
      yield sendEvent('content_block_start', {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' }
      });
      initialized = true;
    }

    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.substring(6);
      if (data.trim() === "[DONE]") {
        yield sendEvent('content_block_stop', { type: 'content_block_stop', index: 0 });
        for (const tc of Object.values(toolCalls)) {
          if (tc.started) yield sendEvent('content_block_stop', { type: 'content_block_stop', index: tc.claudeIndex });
        }
        let finalStopReason = "end_turn";
        try {
          const lastChunk = JSON.parse(lines[lines.length - 2].substring(6));
          const finishReason = lastChunk.choices[0].finish_reason;
          if (finishReason === 'tool_calls') finalStopReason = 'tool_use';
          if (finishReason === 'length') finalStopReason = 'max_tokens';
        } catch {}
        yield sendEvent('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: finalStopReason, stop_sequence: null },
          usage: { output_tokens: 0 }
        });
        yield sendEvent('message_stop', { type: 'message_stop' });
        return;
      }

      try {
        const openaiChunk = JSON.parse(data);
        const delta = openaiChunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          yield sendEvent('content_block_delta', {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: delta.content }
          });
        }

        if (delta.tool_calls) {
          for (const tc_delta of delta.tool_calls) {
            const index = tc_delta.index;
            if (!toolCalls[index]) {
              toolCalls[index] = { id: '', name: '', args: '', claudeIndex: 0, started: false };
            }
            if (tc_delta.id) toolCalls[index].id = tc_delta.id;
            if (tc_delta.function?.name) toolCalls[index].name = tc_delta.function.name;
            if (tc_delta.function?.arguments) toolCalls[index].args += tc_delta.function.arguments;

            if (toolCalls[index].id && toolCalls[index].name && !toolCalls[index].started) {
              contentBlockIndex++;
              toolCalls[index].claudeIndex = contentBlockIndex;
              toolCalls[index].started = true;
              yield sendEvent('content_block_start', {
                type: 'content_block_start',
                index: contentBlockIndex,
                content_block: {
                  type: 'tool_use',
                  id: toolCalls[index].id,
                  name: toolCalls[index].name,
                  input: {}
                }
              });
            }

            if (toolCalls[index].started && tc_delta.function?.arguments) {
              yield sendEvent('content_block_delta', {
                type: 'content_block_delta',
                index: toolCalls[index].claudeIndex,
                delta: { type: 'input_json_delta', partial_json: tc_delta.function.arguments }
              });
            }
          }
        }
      } catch (e) {
        // 忽略 JSON 解析错误
      }
    }
  };
}

module.exports = {
  parsePathAndModel,
  recursivelyCleanSchema,
  convertClaudeToOpenAIRequest,
  convertOpenAIToClaudeResponse,
  createStreamTransformer,
  parseModelRedirections,
  applyModelRedirection
};