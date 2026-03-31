// Stub for @ant/claude-for-chrome-mcp (Anthropic internal package)
export const BROWSER_TOOLS: unknown[] = []

export type ClaudeForChromeContext = Record<string, unknown>
export type Logger = {
  log(...args: unknown[]): void
  error(...args: unknown[]): void
}
export type PermissionMode = string

export function createClaudeForChromeMcpServer(_context: ClaudeForChromeContext): unknown {
  return null
}

export default {}
