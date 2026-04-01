// Telemetry disabled — all 1P event logging is no-op

export type EventSamplingConfig = {
  [eventName: string]: { sample_rate: number }
}

export type GrowthBookExperimentData = {
  experimentId: string
  variationId: number
  userAttributes?: unknown
  experimentMetadata?: Record<string, unknown>
}

export function getEventSamplingConfig(): EventSamplingConfig {
  return {}
}

export function shouldSampleEvent(_eventName: string): number | null {
  return null
}

export function is1PEventLoggingEnabled(): boolean {
  return false
}

export function logEventTo1P(
  _eventName: string,
  _metadata?: Record<string, number | boolean | undefined>,
): void {}

export function logGrowthBookExperimentTo1P(
  _data: GrowthBookExperimentData,
): void {}

export function initialize1PEventLogging(): void {}

export async function shutdown1PEventLogging(): Promise<void> {}

export async function reinitialize1PEventLoggingIfConfigChanged(): Promise<void> {}
