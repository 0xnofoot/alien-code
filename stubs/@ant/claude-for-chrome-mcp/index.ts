// Stub for @ant/claude-for-chrome-mcp — returns a no-op MCP server so
// client.ts's inProcessServer.connect(transport) call succeeds gracefully.
// BROWSER_TOOLS is empty: the model will not see any chrome automation tools.
export const BROWSER_TOOLS: { name: string }[] = []

export type ClaudeForChromeContext = Record<string, unknown>
export type Logger = {
  log(...args: unknown[]): void
  error(...args: unknown[]): void
}
export type PermissionMode = string

export function createClaudeForChromeMcpServer(
  _context: ClaudeForChromeContext,
): { connect(transport: unknown): Promise<void>; close(): Promise<void> } {
  return {
    async connect(_transport: unknown): Promise<void> {},
    async close(): Promise<void> {},
  }
}

export default {}
