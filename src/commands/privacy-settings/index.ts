import type { Command } from '../../commands.js'
// isConsumerSubscriber removed — always false in this fork

const privacySettings = {
  type: 'local-jsx',
  name: 'privacy-settings',
  description: 'View and update your privacy settings',
  isEnabled: () => {
    return false
  },
  load: () => import('./privacy-settings.js'),
} satisfies Command

export default privacySettings
