import { logEvent } from 'src/services/analytics/index.js'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import { getAPIProvider } from '../utils/model/providers.js'
import { getSettings_DEPRECATED } from '../utils/settings/settings.js'

export function resetProToOpusDefault(): void {
  const config = getGlobalConfig()

  if (config.opusProMigrationComplete) {
    return
  }

  const apiProvider = getAPIProvider()

  // All users on firstParty get auto-migrated (subscription check removed)
  if (apiProvider !== 'firstParty') {
    saveGlobalConfig(current => ({
      ...current,
      opusProMigrationComplete: true,
    }))
    return
  }

  const settings = getSettings_DEPRECATED()

  // Only show notification if user was on default (no custom model setting)
  if (settings?.model === undefined) {
    const opusProMigrationTimestamp = Date.now()
    saveGlobalConfig(current => ({
      ...current,
      opusProMigrationComplete: true,
      opusProMigrationTimestamp,
    }))
  } else {
    // User has a custom model setting, just mark migration complete
    saveGlobalConfig(current => ({
      ...current,
      opusProMigrationComplete: true,
    }))
  }
}
