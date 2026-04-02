import type { Command } from '../../commands.js'

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Meet your coding companion',
  argumentHint: '[pet|mute|unmute|status]',
  isEnabled: () => true,
  supportsNonInteractive: false,
  load: () => import('./buddy.js'),
} satisfies Command

export default buddy
