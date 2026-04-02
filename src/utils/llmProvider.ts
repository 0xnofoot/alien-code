/**
 * LLM Provider configuration and runtime state.
 *
 * Read priority for every field:
 *   settings.json "llm-source".{provider}.xxx  →  environment variable  →  default/error
 *
 * Write: /llm-source and /models commands persist changes to userSettings.
 */

import {
  getSettingsWithErrors,
  updateSettingsForSource,
} from './settings/settings.js'

export type LLMProvider = 'anthropic' | 'openai'

// ---------------------------------------------------------------------------
// Helpers: read llm-source config from settings
// ---------------------------------------------------------------------------

interface LLMSourceConfig {
  current?: 'anthropic' | 'openai'
  openai?: {
    base_url?: string
    api_key?: string
    model?: string
    max_tokens?: number
  }
  anthropic?: {
    base_url?: string
    api_key?: string
    model?: string
  }
}

function getLLMSourceConfig(): LLMSourceConfig {
  try {
    const { settings } = getSettingsWithErrors()
    const raw = settings?.['llm-source']
    if (raw && typeof raw === 'object') {
      return raw as unknown as LLMSourceConfig
    }
  } catch {
    // Settings not yet initialized
  }
  return {}
}

// ---------------------------------------------------------------------------
// Provider selection (persisted)
// ---------------------------------------------------------------------------

let currentProvider: LLMProvider | null = null

export function getLLMProvider(): LLMProvider {
  if (currentProvider) return currentProvider
  const cfg = getLLMSourceConfig()
  return cfg.current ?? 'anthropic'
}

export function setLLMProvider(provider: LLMProvider): void {
  currentProvider = provider
}

export function isOpenAIProvider(): boolean {
  return getLLMProvider() === 'openai'
}

// ---------------------------------------------------------------------------
// OpenAI getters — config → env → default
// ---------------------------------------------------------------------------

export function getOpenAIBaseURL(): string {
  const cfg = getLLMSourceConfig().openai
  return cfg?.base_url || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
}

export function getOpenAIApiKey(): string {
  const cfg = getLLMSourceConfig().openai
  return cfg?.api_key || process.env.OPENAI_API_KEY || ''
}

let currentOpenAIModel: string | null = null

export function setOpenAIModel(model: string): void {
  currentOpenAIModel = model
}

export function getOpenAIModel(): string {
  if (currentOpenAIModel) return currentOpenAIModel
  const cfg = getLLMSourceConfig().openai
  if (cfg?.model) return cfg.model
  if (process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL
  const list = getOpenAIModelList()
  if (list.length > 0) return list[0]
  return ''
}

export function getOpenAIMaxTokens(): number | undefined {
  const cfg = getLLMSourceConfig().openai
  if (cfg?.max_tokens !== undefined) return cfg.max_tokens
  const env = process.env.OPENAI_MAX_TOKENS
  if (!env) return undefined
  const val = parseInt(env, 10)
  return Number.isNaN(val) ? undefined : val
}

// ---------------------------------------------------------------------------
// Anthropic getters — config → env → default
// ---------------------------------------------------------------------------

let currentAnthropicModel: string | null = null

export function setAnthropicModel(model: string): void {
  currentAnthropicModel = model
}

export function getAnthropicModel(): string {
  if (currentAnthropicModel) return currentAnthropicModel
  const cfg = getLLMSourceConfig().anthropic
  if (cfg?.model) return cfg.model
  if (process.env.ANTHROPIC_DEFAULT_MODEL) return process.env.ANTHROPIC_DEFAULT_MODEL
  const list = getAnthropicModelList()
  if (list.length > 0) return list[0]
  return ''
}

export function getAnthropicBaseURL(): string {
  const cfg = getLLMSourceConfig().anthropic
  return cfg?.base_url || process.env.ANTHROPIC_BASE_URL || ''
}

export function getAnthropicApiKey(): string {
  const cfg = getLLMSourceConfig().anthropic
  return cfg?.api_key || process.env.ANTHROPIC_API_KEY || ''
}

// ---------------------------------------------------------------------------
// Model lists from "models" config
// ---------------------------------------------------------------------------

export function getOpenAIModelList(): string[] {
  try {
    const { settings } = getSettingsWithErrors()
    const models = settings?.models
    if (models && typeof models === 'object') {
      const list = (models as Record<string, unknown>).openai
      if (Array.isArray(list)) {
        return list.filter((m): m is string => typeof m === 'string')
      }
    }
  } catch {
    // Settings not yet initialized
  }
  return []
}

export function getAnthropicModelList(): string[] {
  try {
    const { settings } = getSettingsWithErrors()
    const models = settings?.models
    if (models && typeof models === 'object') {
      const list = (models as Record<string, unknown>).anthropic
      if (Array.isArray(list)) {
        return list.filter((m): m is string => typeof m === 'string')
      }
    }
  } catch {
    // Settings not yet initialized
  }
  return []
}

// ---------------------------------------------------------------------------
// Persist to settings.json
// ---------------------------------------------------------------------------

/**
 * Write a value into the llm-source config in userSettings.
 * Examples:
 *   persistLLMSource({ current: 'openai' })
 *   persistLLMSource({ openai: { model: 'gpt-4o' } })
 */
export function persistLLMSource(
  patch: Partial<LLMSourceConfig>,
): void {
  try {
    const existing = getLLMSourceConfig()
    const merged: LLMSourceConfig = { ...existing }

    if (patch.current !== undefined) {
      merged.current = patch.current
    }
    if (patch.openai) {
      merged.openai = { ...merged.openai, ...patch.openai }
    }
    if (patch.anthropic) {
      merged.anthropic = { ...merged.anthropic, ...patch.anthropic }
    }

    updateSettingsForSource('userSettings', {
      'llm-source': merged,
    } as Record<string, unknown>)
  } catch {
    // Best effort — don't crash if settings write fails
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateOpenAIConfig(): string | null {
  if (!getOpenAIApiKey()) {
    return 'OPENAI_API_KEY is not set. Configure llm-source.openai.api_key in settings.json or set the OPENAI_API_KEY env var.'
  }
  return null
}
