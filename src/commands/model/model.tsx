import chalk from 'chalk'
import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select } from '../../components/CustomSelect/index.js'
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js'
import { useSetAppState } from '../../state/AppState.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  isOpenAIProvider,
  getLLMProvider,
  getAnthropicModel,
  getAnthropicModelList,
  setAnthropicModel,
  getOpenAIModel,
  getOpenAIModelList,
  setOpenAIModel,
  persistLLMSource,
} from '../../utils/llmProvider.js'

// ---------------------------------------------------------------------------
// Unified model picker — works for both Anthropic and OpenAI
// ---------------------------------------------------------------------------

type OnDone = (
  result?: string,
  options?: { display?: CommandResultDisplay },
) => void

function getModelsAndCurrent(): { list: string[]; current: string } {
  if (isOpenAIProvider()) {
    const current = getOpenAIModel()
    const configList = getOpenAIModelList()
    const modelSet = new Set(configList)
    if (current) modelSet.add(current)
    return { list: Array.from(modelSet), current }
  }

  // Anthropic mode
  const current = getAnthropicModel()
  const configList = getAnthropicModelList()
  const modelSet = new Set(configList)
  if (current) modelSet.add(current)
  return { list: Array.from(modelSet), current }
}

function applyModel(model: string, setAppState: ReturnType<typeof useSetAppState>): void {
  const provider = getLLMProvider()
  if (isOpenAIProvider()) {
    setOpenAIModel(model)
    persistLLMSource({ openai: { model } })
  } else {
    setAnthropicModel(model)
    persistLLMSource({ anthropic: { model } })
    setAppState(prev => ({
      ...prev,
      mainLoopModel: model,
      mainLoopModelForSession: null,
    }))
  }
}

function ModelPickerUnified({ onDone }: { onDone: OnDone }): React.ReactNode {
  const setAppState = useSetAppState()
  const provider = getLLMProvider().toUpperCase()
  const { list, current } = getModelsAndCurrent()

  if (list.length === 0) {
    const envVar = isOpenAIProvider() ? 'OPENAI_MODEL' : 'ANTHROPIC_DEFAULT_MODEL'
    const providerKey = getLLMProvider()
    onDone(
      `No models available. Set ${envVar} env var or add models.${providerKey} to settings.json, e.g.:\n  "models": { "${providerKey}": ["model-a", "model-b"] }`,
      { display: 'system' },
    )
    return null
  }

  const options = list.map(m => ({
    value: m,
    label: `${m}${m === current ? ' (current)' : ''}`,
  }))

  function handleSelect(value: string) {
    applyModel(value, setAppState)
    onDone(`Set model to ${chalk.bold(value)}`)
  }

  function handleCancel() {
    onDone(`Kept model as ${chalk.bold(current)}`, { display: 'system' })
  }

  return (
    <Select
      options={options}
      defaultValue={current}
      defaultFocusValue={current}
      onChange={handleSelect}
      onCancel={handleCancel}
    />
  )
}

function SetModelDirect({ args, onDone }: { args: string; onDone: OnDone }): React.ReactNode {
  const setAppState = useSetAppState()
  React.useEffect(() => {
    applyModel(args, setAppState)
    onDone(`Set model to ${chalk.bold(args)}`)
  }, [args, onDone, setAppState])
  return null
}

function ShowCurrentModel({ onDone }: { onDone: OnDone }): React.ReactNode {
  const { current } = getModelsAndCurrent()
  const provider = getLLMProvider().toUpperCase()
  onDone(`Current model (${provider}): ${chalk.bold(current)}`)
  return null
}

// ---------------------------------------------------------------------------
// Command entry point
// ---------------------------------------------------------------------------

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  args = args?.trim() || ''

  if (COMMON_INFO_ARGS.includes(args)) {
    return <ShowCurrentModel onDone={onDone} />
  }
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone('Run /model to select a model, or /model [name] to set it directly.', {
      display: 'system',
    })
    return
  }
  if (args) {
    return <SetModelDirect args={args} onDone={onDone} />
  }
  return <ModelPickerUnified onDone={onDone} />
}
