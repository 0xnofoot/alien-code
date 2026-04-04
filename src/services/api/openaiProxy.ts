/**
 * Fetch-level proxy that transparently converts Anthropic API requests to
 * OpenAI chat/completions format and converts the responses back.
 *
 * Instead of duck-typing the Anthropic SDK client, we intercept at the fetch
 * layer. The real Anthropic SDK handles all response parsing, so we avoid
 * field compatibility issues (usage.speed, server_tool_use, etc.).
 *
 * Conversion logic adapted from https://github.com/musistudio/llms
 */

import type { ClientOptions } from '@anthropic-ai/sdk'
import {
  getOpenAIApiKey,
  getOpenAIBaseURL,
  getOpenAIMaxTokens,
  getOpenAIModel,
} from '../../utils/llmProvider.js'

// ---------------------------------------------------------------------------
// Main entry: returns a fetch function for the Anthropic SDK
// ---------------------------------------------------------------------------

export function createOpenAIProxyFetch(): ClientOptions['fetch'] {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input)

    // Only intercept /v1/messages requests
    if (!url.includes('/v1/messages')) {
      // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
      return globalThis.fetch(input, init)
    }

    let anthropicBody: Record<string, unknown>
    try {
      anthropicBody = JSON.parse(init?.body as string)
    } catch {
      return new Response(
        JSON.stringify({
          type: 'error',
          error: { type: 'invalid_request_error', message: 'Invalid request body' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    const model = getOpenAIModel()
    const baseURL = getOpenAIBaseURL().replace(/\/$/, '')
    const apiKey = getOpenAIApiKey()
    const isStreaming = anthropicBody.stream === true

    // Convert Anthropic request → OpenAI request
    const openaiBody = convertAnthropicToOpenAI(anthropicBody, model)

    // Send to OpenAI endpoint
    // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
    const openaiResponse = await globalThis.fetch(
      `${baseURL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(openaiBody),
        signal: init?.signal,
      },
    )

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text().catch(() => 'unknown error')
      return new Response(
        JSON.stringify({
          type: 'error',
          error: {
            type: 'api_error',
            message: `OpenAI API error ${openaiResponse.status}: ${errorText}`,
          },
        }),
        {
          status: openaiResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'request-id': `openai-proxy-${Date.now()}`,
          },
        },
      )
    }

    // Convert OpenAI response → Anthropic response
    if (isStreaming) {
      if (!openaiResponse.body) {
        throw new Error('OpenAI streaming response body is null')
      }
      const anthropicStream = convertOpenAIStreamToAnthropicSSE(
        openaiResponse.body,
        model,
      )
      return new Response(anthropicStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'request-id': `openai-proxy-${Date.now()}`,
        },
      })
    } else {
      const data = (await openaiResponse.json()) as OpenAIChatCompletion
      const anthropicData = convertOpenAIJsonToAnthropic(data, model)
      return new Response(JSON.stringify(anthropicData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'request-id': `openai-proxy-${Date.now()}`,
        },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Request conversion: Anthropic → OpenAI
// ---------------------------------------------------------------------------

interface OpenAIMessage {
  role: string
  content: string | OpenAIContentPart[]
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface OpenAIContentPart {
  type: string
  text?: string
  image_url?: { url: string }
}

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

interface OpenAIChatCompletion {
  id: string
  model: string
  choices: {
    message: {
      role: string
      content: string | null
      tool_calls?: OpenAIToolCall[]
    }
    finish_reason: string
  }[]
  usage?: { prompt_tokens: number; completion_tokens: number }
}

/**
 * Cap max_tokens based on OPENAI_MAX_TOKENS env var.
 * When set, use the smaller of the requested value and the cap.
 * When not set, pass through the original value unchanged.
 */
function capMaxTokens(requested: number | undefined): number | undefined {
  const cap = getOpenAIMaxTokens()
  if (cap === undefined) return requested
  if (requested === undefined) return cap
  return Math.min(requested, cap)
}

function convertAnthropicToOpenAI(
  body: Record<string, unknown>,
  model: string,
): Record<string, unknown> {
  const messages: OpenAIMessage[] = []

  // System prompt
  const system = body.system as
    | string
    | { type: string; text: string }[]
    | undefined
  if (system) {
    let systemText = ''
    if (typeof system === 'string') {
      systemText = system
    } else if (Array.isArray(system)) {
      systemText = system
        .filter((b) => b?.type === 'text')
        .map((b) => b.text)
        .join('\n')
    }
    if (systemText) {
      messages.push({ role: 'system', content: systemText })
    }
  }

  // Messages
  const anthropicMessages = (body.messages ?? []) as Record<string, unknown>[]
  for (const msg of anthropicMessages) {
    const role = msg.role as string
    const content = msg.content

    if (typeof content === 'string') {
      messages.push({ role, content })
      continue
    }

    if (!Array.isArray(content)) {
      messages.push({ role, content: '' })
      continue
    }

    // Process content blocks
    const textParts: string[] = []
    const toolCalls: OpenAIToolCall[] = []
    const contentParts: OpenAIContentPart[] = []
    let hasImageContent = false

    for (const block of content as Record<string, unknown>[]) {
      switch (block.type) {
        case 'text':
          textParts.push(block.text as string)
          contentParts.push({ type: 'text', text: block.text as string })
          break

        case 'image': {
          hasImageContent = true
          const source = block.source as Record<string, string>
          const dataUri = `data:${source.media_type};base64,${source.data}`
          contentParts.push({
            type: 'image_url',
            image_url: { url: dataUri },
          })
          break
        }

        case 'tool_use':
          toolCalls.push({
            id: block.id as string,
            type: 'function',
            function: {
              name: block.name as string,
              arguments: JSON.stringify(block.input),
            },
          })
          break

        case 'tool_result': {
          // Tool results become separate messages with role "tool"
          const resultContent = block.content
          let text = ''
          if (typeof resultContent === 'string') {
            text = resultContent
          } else if (Array.isArray(resultContent)) {
            text = (resultContent as Record<string, unknown>[])
              .filter((b) => b.type === 'text')
              .map((b) => b.text as string)
              .join('')
          }
          messages.push({
            role: 'tool',
            tool_call_id: block.tool_use_id as string,
            content: text || (block.is_error ? 'Error' : 'Success'),
          })
          continue
        }

        case 'thinking':
        case 'redacted_thinking':
          // Omit thinking blocks for OpenAI
          break
      }
    }

    // Build the message for this role
    if (role === 'assistant') {
      const assistantMsg: OpenAIMessage = {
        role: 'assistant',
        content: textParts.join(''),
      }
      if (toolCalls.length > 0) {
        assistantMsg.tool_calls = toolCalls
      }
      messages.push(assistantMsg)
    } else if (role === 'user') {
      if (hasImageContent) {
        messages.push({ role: 'user', content: contentParts })
      } else {
        messages.push({ role: 'user', content: textParts.join('') })
      }
    }
  }

  // Build OpenAI request
  const openaiBody: Record<string, unknown> = {
    model,
    messages,
    max_tokens: capMaxTokens(body.max_tokens as number | undefined),
    stream: body.stream,
  }

  if (body.stream) {
    openaiBody.stream_options = { include_usage: true }
  }

  if (body.temperature !== undefined) {
    openaiBody.temperature = body.temperature
  }

  if (body.top_p !== undefined) {
    openaiBody.top_p = body.top_p
  }

  // Tools
  const tools = body.tools as Record<string, unknown>[] | undefined
  if (tools && tools.length > 0) {
    openaiBody.tools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description || '',
        parameters: t.input_schema,
      },
    }))
  }

  // Tool choice
  if (body.tool_choice !== undefined) {
    const tc = body.tool_choice as Record<string, unknown>
    if (tc.type === 'auto') {
      openaiBody.tool_choice = 'auto'
    } else if (tc.type === 'any') {
      openaiBody.tool_choice = 'required'
    } else if (tc.type === 'tool' && tc.name) {
      openaiBody.tool_choice = {
        type: 'function',
        function: { name: tc.name },
      }
    }
  }

  return openaiBody
}

// ---------------------------------------------------------------------------
// Streaming response conversion: OpenAI SSE → Anthropic SSE
// ---------------------------------------------------------------------------

function convertOpenAIStreamToAnthropicSSE(
  openaiBody: ReadableStream<Uint8Array>,
  model: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const messageId = `msg_${Date.now()}`

  // State
  let hasStarted = false
  let hasTextBlockStarted = false
  let isClosed = false
  let contentBlockIndex = 0
  let outputTokens = 0
  let inputTokens = 0
  let stopReason: string = 'end_turn'

  const toolCalls = new Map<
    number,
    { id: string; name: string; arguments: string; blockIndex: number }
  >()

  function sseEvent(eventType: string, data: unknown): Uint8Array {
    return encoder.encode(
      `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`,
    )
  }

  function safeEnqueue(
    controller: ReadableStreamDefaultController,
    chunk: Uint8Array,
  ) {
    if (!isClosed) {
      try {
        controller.enqueue(chunk)
      } catch {
        // controller closed
      }
    }
  }

  function emitMessageStart(controller: ReadableStreamDefaultController) {
    if (hasStarted) return
    hasStarted = true
    safeEnqueue(
      controller,
      sseEvent('message_start', {
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          content: [],
          model,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: inputTokens, output_tokens: 0 },
        },
      }),
    )
  }

  function emitTextBlockStart(controller: ReadableStreamDefaultController) {
    if (hasTextBlockStarted) return
    hasTextBlockStarted = true
    safeEnqueue(
      controller,
      sseEvent('content_block_start', {
        type: 'content_block_start',
        index: contentBlockIndex,
        content_block: { type: 'text', text: '' },
      }),
    )
  }

  function closeTextBlock(controller: ReadableStreamDefaultController) {
    if (!hasTextBlockStarted) return
    hasTextBlockStarted = false
    safeEnqueue(
      controller,
      sseEvent('content_block_stop', {
        type: 'content_block_stop',
        index: contentBlockIndex,
      }),
    )
    contentBlockIndex++
  }

  return new ReadableStream({
    start: async (controller) => {
      const reader = openaiBody.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) continue

            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') {
              stopReason = stopReason ?? 'end_turn'
              break
            }

            let chunk: Record<string, unknown>
            try {
              chunk = JSON.parse(data)
            } catch {
              continue
            }

            const choices = chunk.choices as Record<string, unknown>[]
            if (!choices || choices.length === 0) {
              // Final usage-only chunk
              const usage = chunk.usage as Record<string, number> | undefined
              if (usage) {
                inputTokens = usage.prompt_tokens ?? inputTokens
                outputTokens = usage.completion_tokens ?? outputTokens
              }
              continue
            }

            const choice = choices[0]
            const delta = choice.delta as Record<string, unknown> | undefined
            if (!delta) continue

            // Ensure message_start is emitted
            emitMessageStart(controller)

            // Text content
            const textContent = delta.content as string | undefined
            if (textContent) {
              emitTextBlockStart(controller)
              safeEnqueue(
                controller,
                sseEvent('content_block_delta', {
                  type: 'content_block_delta',
                  index: contentBlockIndex,
                  delta: { type: 'text_delta', text: textContent },
                }),
              )
            }

            // Tool calls
            const deltaToolCalls = delta.tool_calls as
              | Record<string, unknown>[]
              | undefined
            if (deltaToolCalls) {
              for (const tc of deltaToolCalls) {
                const tcIndex = tc.index as number
                const fn = tc.function as Record<string, string> | undefined

                if (!toolCalls.has(tcIndex)) {
                  // New tool call — close text block if open
                  closeTextBlock(controller)

                  const blockIdx = contentBlockIndex++
                  toolCalls.set(tcIndex, {
                    id: (tc.id as string) || `call_${Date.now()}_${tcIndex}`,
                    name: fn?.name || '',
                    arguments: fn?.arguments || '',
                    blockIndex: blockIdx,
                  })

                  safeEnqueue(
                    controller,
                    sseEvent('content_block_start', {
                      type: 'content_block_start',
                      index: blockIdx,
                      content_block: {
                        type: 'tool_use',
                        id: toolCalls.get(tcIndex)!.id,
                        name: toolCalls.get(tcIndex)!.name,
                        input: {},
                      },
                    }),
                  )

                  // Emit initial arguments if present
                  if (fn?.arguments) {
                    safeEnqueue(
                      controller,
                      sseEvent('content_block_delta', {
                        type: 'content_block_delta',
                        index: blockIdx,
                        delta: {
                          type: 'input_json_delta',
                          partial_json: fn.arguments,
                        },
                      }),
                    )
                  }
                } else {
                  // Continuing tool call — accumulate arguments
                  const existing = toolCalls.get(tcIndex)!
                  if (fn?.arguments) {
                    existing.arguments += fn.arguments
                    safeEnqueue(
                      controller,
                      sseEvent('content_block_delta', {
                        type: 'content_block_delta',
                        index: existing.blockIndex,
                        delta: {
                          type: 'input_json_delta',
                          partial_json: fn.arguments,
                        },
                      }),
                    )
                  }
                  // Update id/name if they arrive later
                  if (tc.id) existing.id = tc.id as string
                  if (fn?.name) existing.name = fn.name
                }
              }
            }

            // Finish reason
            if (choice.finish_reason) {
              const fr = choice.finish_reason as string
              stopReason =
                fr === 'stop'
                  ? 'end_turn'
                  : fr === 'tool_calls'
                    ? 'tool_use'
                    : fr === 'length'
                      ? 'max_tokens'
                      : 'end_turn'
            }

            // Usage from choice-level
            const chunkUsage = chunk.usage as
              | Record<string, number>
              | undefined
            if (chunkUsage) {
              if (chunkUsage.prompt_tokens)
                inputTokens = chunkUsage.prompt_tokens
              if (chunkUsage.completion_tokens)
                outputTokens = chunkUsage.completion_tokens
            }
          }
        }

        // Ensure message_start was sent (empty response edge case)
        emitMessageStart(controller)

        // Close open text block
        closeTextBlock(controller)

        // Close open tool call blocks
        for (const [, tc] of toolCalls) {
          safeEnqueue(
            controller,
            sseEvent('content_block_stop', {
              type: 'content_block_stop',
              index: tc.blockIndex,
            }),
          )
        }

        // message_delta with final usage and stop reason
        safeEnqueue(
          controller,
          sseEvent('message_delta', {
            type: 'message_delta',
            delta: { stop_reason: stopReason, stop_sequence: null },
            usage: { output_tokens: outputTokens },
          }),
        )

        // message_stop
        safeEnqueue(
          controller,
          sseEvent('message_stop', { type: 'message_stop' }),
        )

        isClosed = true
        controller.close()
      } catch (error) {
        if (!isClosed) {
          try {
            controller.error(error)
          } catch {
            // already closed
          }
        }
      } finally {
        try {
          reader.releaseLock()
        } catch {
          // ignore
        }
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Non-streaming response conversion: OpenAI JSON → Anthropic JSON
// ---------------------------------------------------------------------------

function convertOpenAIJsonToAnthropic(
  data: OpenAIChatCompletion,
  model: string,
): Record<string, unknown> {
  const choice = data.choices?.[0]
  if (!choice) {
    return {
      id: data.id || `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: '' }],
      model,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    }
  }

  const content: Record<string, unknown>[] = []

  // Text content
  if (choice.message.content) {
    content.push({ type: 'text', text: choice.message.content })
  }

  // Tool calls
  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      let input: unknown = {}
      try {
        input = JSON.parse(tc.function.arguments)
      } catch {
        input = {}
      }
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input,
      })
    }
  }

  // Map finish reason
  let stopReason = 'end_turn'
  if (choice.finish_reason === 'tool_calls') stopReason = 'tool_use'
  else if (choice.finish_reason === 'length') stopReason = 'max_tokens'

  return {
    id: data.id || `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: content.length > 0 ? content : [{ type: 'text', text: '' }],
    model,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
  }
}
