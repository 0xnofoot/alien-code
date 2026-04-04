// Stub for @anthropic-ai/mcpb — types used by src/ that real package exports under different names.
// The real package (v2.1.2) exports McpbManifestAny, not McpbManifest, and has no
// McpbUserConfigurationOption type (only McpbUserConfigurationOptionSchema).
// These aliases keep src/ compiling without touching the real imports.
export type { McpbManifestAny as McpbManifest } from '@anthropic-ai/mcpb'
export type McpbUserConfigurationOption = {
  type: 'string' | 'number' | 'boolean' | 'directory' | 'file'
  title: string
  description: string
  required?: boolean
  default?: string | number | boolean | string[]
  multiple?: boolean
  sensitive?: boolean
  min?: number
  max?: number
}
export default {}
