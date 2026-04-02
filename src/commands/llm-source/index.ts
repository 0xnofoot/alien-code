import type { Command } from '../../commands.js'

const command = {
  name: 'llm-source',
  description: 'Switch between Anthropic and OpenAI-compatible LLM providers',
  supportsNonInteractive: false,
  type: 'local-jsx',
  load: () => import('./llm-source.js'),
} satisfies Command

export default command
