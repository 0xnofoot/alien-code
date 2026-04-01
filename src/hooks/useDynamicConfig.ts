import React from 'react'

/**
 * React hook for dynamic config values.
 * GrowthBook has been removed; always returns the default value.
 */
export function useDynamicConfig<T>(_configName: string, defaultValue: T): T {
  const [configValue] = React.useState<T>(defaultValue)
  return configValue
}
