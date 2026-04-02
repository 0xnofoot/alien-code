import { getCompanion, companionUserId, roll } from '../../buddy/companion.js'
import { renderSprite } from '../../buddy/sprites.js'
import { RARITY_STARS, type StoredCompanion } from '../../buddy/types.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'

function formatCompanionCard(): string {
  const companion = getCompanion()
  if (!companion) return ''
  const stars = RARITY_STARS[companion.rarity]
  const sprite = renderSprite(companion, 0)
  const shinyTag = companion.shiny ? ' ✨ SHINY' : ''
  const lines = [
    `${companion.name}  ${stars} ${companion.rarity}${shinyTag}`,
    `"${companion.personality}"`,
    '',
    ...sprite,
    '',
    `Species: ${companion.species}  Eye: ${companion.eye}  Hat: ${companion.hat === 'none' ? '—' : companion.hat}`,
    '',
    ...Object.entries(companion.stats).map(
      ([k, v]) => `  ${k.padEnd(10)} ${'█'.repeat(Math.round(v / 5))}${'░'.repeat(20 - Math.round(v / 5))} ${v}`,
    ),
  ]
  return lines.join('\n')
}

export const call: LocalCommandCall = async (args, context) => {
  const sub = args.trim().toLowerCase()

  // /buddy pet — trigger heart animation
  if (sub === 'pet') {
    const companion = getCompanion()
    if (!companion) {
      return { type: 'text', value: 'You don\'t have a companion yet! Run /buddy to hatch one.' }
    }
    context.setAppState(prev => ({ ...prev, companionPetAt: Date.now() }))
    return { type: 'text', value: `You pet ${companion.name}! ❤️` }
  }

  // /buddy mute — hide companion
  if (sub === 'mute') {
    saveGlobalConfig(c => ({ ...c, companionMuted: true }))
    return { type: 'text', value: 'Companion muted. Run /buddy unmute to bring them back.' }
  }

  // /buddy unmute — show companion
  if (sub === 'unmute') {
    saveGlobalConfig(c => ({ ...c, companionMuted: false }))
    return { type: 'text', value: 'Companion unmuted!' }
  }

  // /buddy status — show card
  if (sub === 'status') {
    const companion = getCompanion()
    if (!companion) {
      return { type: 'text', value: 'No companion hatched yet. Run /buddy to hatch one!' }
    }
    return { type: 'text', value: formatCompanionCard() }
  }

  // /buddy (no args) — hatch or show
  const existing = getCompanion()
  if (existing) {
    return { type: 'text', value: formatCompanionCard() }
  }

  // First time: hatch a companion
  const userId = companionUserId()
  const { bones } = roll(userId)
  const name = `${bones.species.charAt(0).toUpperCase()}${bones.species.slice(1)}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`
  const personality = `A ${bones.rarity} ${bones.species} who loves coding`

  const soul: StoredCompanion = {
    name,
    personality,
    hatchedAt: Date.now(),
  }
  saveGlobalConfig(c => ({ ...c, companion: soul }))

  const card = formatCompanionCard()
  return {
    type: 'text',
    value: `🥚 An egg appears... and hatches!\n\n${card}\n\nYour companion will hang out beside your input. Try /buddy pet!`,
  }
}
