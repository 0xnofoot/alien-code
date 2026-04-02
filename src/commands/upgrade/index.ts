import type { Command } from '../../commands.js'
import { getSubscriptionType } from '../../utils/auth.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

const upgrade = {
  type: 'local-jsx',
  name: 'upgrade',
  description: 'Upgrade to Max for higher rate limits and more Opus',
  availability: ['claude-ai'],
  isEnabled: () =>
    // getSubscriptionType() always returns null, so the check is always true
    !isEnvTruthy(process.env.DISABLE_UPGRADE_COMMAND),
  load: () => import('./upgrade.js'),
} satisfies Command

export default upgrade
