import type { SubscriptionType } from '../services/oauth/types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApiKeySource =
  | 'ANTHROPIC_API_KEY'
  | 'none'

export type UserAccountInfo = {
  apiKeySource?: ApiKeySource
}

export type OrgValidationResult =
  | { valid: true }
  | { valid: false; message: string }

// ---------------------------------------------------------------------------
// API key — env var only
// ---------------------------------------------------------------------------

export function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null
}

export function hasAnthropicApiKeyAuth(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

export function getAnthropicApiKeyWithSource(
  _opts: { skipRetrievingKeyFromApiKeyHelper?: boolean } = {},
): { key: string | null; source: ApiKeySource } {
  if (process.env.ANTHROPIC_API_KEY) {
    return { key: process.env.ANTHROPIC_API_KEY, source: 'ANTHROPIC_API_KEY' }
  }
  return { key: null, source: 'none' }
}

// ---------------------------------------------------------------------------
// Cache-clear noops (called by onChangeAppState.ts on settings changes)
// ---------------------------------------------------------------------------

export function clearApiKeyHelperCache(): void {}
export function clearAwsCredentialsCache(): void {}
export function clearGcpCredentialsCache(): void {}

// ---------------------------------------------------------------------------
// SubscriptionType type re-export (type compatibility only)
// ---------------------------------------------------------------------------

export type { SubscriptionType }
