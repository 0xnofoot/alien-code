import chalk from 'chalk'
import * as React from 'react'
import { Select } from '../../components/CustomSelect/index.js'
import TextInput from '../../components/TextInput.js'
import { Box, Text, useInput } from '../../ink.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  type LLMProvider,
  getLLMProvider,
  getOpenAIBaseURL,
  getOpenAIApiKey,
  getOpenAIModel,
  getOpenAIMaxTokens,
  getAnthropicBaseURL,
  getAnthropicApiKey,
  getAnthropicModel,
  setLLMProvider,
  persistLLMSource,
  validateOpenAIConfig,
} from '../../utils/llmProvider.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OnDone = (result?: string, options?: { display?: string }) => void

type Phase =
  | { step: 'pick-provider' }
  | { step: 'configure'; provider: LLMProvider }
  | { step: 'edit-field'; provider: LLMProvider; field: string; currentValue: string }

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function LLMSourceFlow({ onDone, initialArg }: { onDone: OnDone; initialArg: string }): React.ReactNode {
  const [phase, setPhase] = React.useState<Phase>(() => {
    const arg = initialArg.trim().toLowerCase()
    if (arg === 'anthropic' || arg === 'openai') {
      return { step: 'configure', provider: arg }
    }
    return { step: 'pick-provider' }
  })

  // Step 1: Pick provider
  if (phase.step === 'pick-provider') {
    return (
      <ProviderPicker
        onSelect={(provider) => setPhase({ step: 'configure', provider })}
        onCancel={() => onDone(`Current: ${getLLMProvider().toUpperCase()}`, { display: 'system' })}
      />
    )
  }

  // Step 2: Configure provider
  if (phase.step === 'configure') {
    return (
      <ProviderConfig
        provider={phase.provider}
        onEditField={(field, currentValue) =>
          setPhase({ step: 'edit-field', provider: phase.provider, field, currentValue })
        }
        onConfirm={() => {
          const result = applySwitch(phase.provider)
          onDone(result)
        }}
        onCancel={() => setPhase({ step: 'pick-provider' })}
      />
    )
  }

  // Step 3: Edit a field
  if (phase.step === 'edit-field') {
    return (
      <FieldEditor
        provider={phase.provider}
        field={phase.field}
        currentValue={phase.currentValue}
        onSave={(value) => {
          saveField(phase.provider, phase.field, value)
          setPhase({ step: 'configure', provider: phase.provider })
        }}
        onCancel={() => setPhase({ step: 'configure', provider: phase.provider })}
      />
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Step 1: Provider picker
// ---------------------------------------------------------------------------

function ProviderPicker({ onSelect, onCancel }: {
  onSelect: (p: LLMProvider) => void
  onCancel: () => void
}): React.ReactNode {
  const current = getLLMProvider()
  const options = [
    { value: 'anthropic' as const, label: `Anthropic${current === 'anthropic' ? ' (current)' : ''}` },
    { value: 'openai' as const, label: `OpenAI${current === 'openai' ? ' (current)' : ''}` },
  ]
  return (
    <Select
      options={options}
      defaultValue={current}
      defaultFocusValue={current}
      onChange={onSelect}
      onCancel={onCancel}
    />
  )
}

// ---------------------------------------------------------------------------
// Step 2: Provider config menu
// ---------------------------------------------------------------------------

function getFieldsForProvider(provider: LLMProvider): { key: string; label: string; getValue: () => string }[] {
  if (provider === 'openai') {
    return [
      { key: 'base_url', label: 'Base URL', getValue: getOpenAIBaseURL },
      { key: 'api_key', label: 'API Key', getValue: () => maskKey(getOpenAIApiKey()) },
      { key: 'model', label: 'Model', getValue: getOpenAIModel },
      { key: 'max_tokens', label: 'Max Tokens', getValue: () => String(getOpenAIMaxTokens() ?? 'auto') },
    ]
  }
  return [
    { key: 'base_url', label: 'Base URL', getValue: () => getAnthropicBaseURL() || '(default)' },
    { key: 'api_key', label: 'API Key', getValue: () => maskKey(getAnthropicApiKey()) },
    { key: 'model', label: 'Model', getValue: getAnthropicModel },
  ]
}

function getRawValue(provider: LLMProvider, field: string): string {
  if (provider === 'openai') {
    switch (field) {
      case 'base_url': return getOpenAIBaseURL()
      case 'api_key': return getOpenAIApiKey()
      case 'model': return getOpenAIModel()
      case 'max_tokens': return String(getOpenAIMaxTokens() ?? '')
      default: return ''
    }
  }
  switch (field) {
    case 'base_url': return getAnthropicBaseURL()
    case 'api_key': return getAnthropicApiKey()
    case 'model': return getAnthropicModel()
    default: return ''
  }
}

function ProviderConfig({ provider, onEditField, onConfirm, onCancel }: {
  provider: LLMProvider
  onEditField: (field: string, currentValue: string) => void
  onConfirm: () => void
  onCancel: () => void
}): React.ReactNode {
  const fields = getFieldsForProvider(provider)
  const options = [
    ...fields.map(f => ({
      value: f.key,
      label: `${f.label}: ${chalk.cyan(f.getValue() || '(empty)')}`,
    })),
    { value: '__confirm__', label: chalk.green('✓ Confirm & Switch') },
  ]

  function handleSelect(value: string) {
    if (value === '__confirm__') {
      onConfirm()
    } else {
      onEditField(value, getRawValue(provider, value))
    }
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{`Configure ${provider.toUpperCase()}`}</Text>
      <Text dimColor>Select a field to edit, or confirm to switch</Text>
      <Select
        options={options}
        onChange={handleSelect}
        onCancel={onCancel}
      />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Field editor
// ---------------------------------------------------------------------------

function FieldEditor({ provider, field, currentValue, onSave, onCancel }: {
  provider: LLMProvider
  field: string
  currentValue: string
  onSave: (value: string) => void
  onCancel: () => void
}): React.ReactNode {
  const [value, setValue] = React.useState(currentValue)
  const [cursorOffset, setCursorOffset] = React.useState(0)
  const label = field.replace(/_/g, ' ').toUpperCase()

  useInput((_input, key) => {
    if (key.escape) {
      onCancel()
    }
  })

  return (
    <Box flexDirection="column">
      <Text bold>{`Edit ${label} (${provider})`}</Text>
      <Text dimColor>Enter to save, Esc to cancel</Text>
      <Box borderStyle="round" borderDimColor paddingLeft={1}>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={() => onSave(value)}
          showCursor
          columns={80}
          cursorOffset={cursorOffset}
          onChangeCursorOffset={setCursorOffset}
        />
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskKey(key: string): string {
  if (!key) return '(empty)'
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}

function saveField(provider: LLMProvider, field: string, value: string): void {
  const patch: Record<string, unknown> = {}
  if (field === 'max_tokens') {
    const num = parseInt(value, 10)
    patch[field] = Number.isNaN(num) ? undefined : num
  } else {
    patch[field] = value
  }
  persistLLMSource({ [provider]: patch })
}

function applySwitch(target: LLMProvider): string {
  const current = getLLMProvider()

  if (target === 'openai') {
    const err = validateOpenAIConfig()
    if (err) return `Cannot switch to OpenAI: ${err}`
  }

  if (current === target) {
    return `Already using ${target.toUpperCase()} provider.`
  }

  setLLMProvider(target)
  persistLLMSource({ current: target })

  const lines = [`Switched to ${target.toUpperCase()} provider.`]
  if (target === 'openai') {
    lines.push('')
    lines.push(`  Base URL : ${getOpenAIBaseURL()}`)
    lines.push(`  Model    : ${getOpenAIModel()}`)
  } else {
    const model = getAnthropicModel()
    if (model) {
      lines.push('')
      lines.push(`  Model    : ${model}`)
    }
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  return <LLMSourceFlow onDone={onDone} initialArg={args ?? ''} />
}
