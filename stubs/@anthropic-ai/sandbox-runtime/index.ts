// Stub for @anthropic-ai/sandbox-runtime (Anthropic internal package)
import { z } from 'zod'

export type FsReadRestrictionConfig = Record<string, unknown>
export type FsWriteRestrictionConfig = Record<string, unknown>
export type IgnoreViolationsConfig = Record<string, unknown>
export type NetworkHostPattern = string
export type NetworkRestrictionConfig = Record<string, unknown>
export type SandboxAskCallback = () => Promise<boolean>
export type SandboxDependencyCheck = Record<string, unknown>
export type SandboxRuntimeConfig = Record<string, unknown>
export type SandboxViolationEvent = Record<string, unknown>

export const SandboxRuntimeConfigSchema = z.object({}).passthrough()

export class SandboxViolationStore {
  private listeners = new Set<(violations: SandboxViolationEvent[]) => void>()
  private totalCount = 0
  getViolations() { return [] }
  getCount() { return 0 }
  getTotalCount() { return this.totalCount }
  getViolationsForCommand(_command: string) { return [] }
  addViolation(_event: SandboxViolationEvent) { this.totalCount++ }
  clear() {}
  subscribe(listener: (violations: SandboxViolationEvent[]) => void) {
    this.listeners.add(listener)
    listener(this.getViolations())
    return () => { this.listeners.delete(listener) }
  }
}

export class SandboxManager {
  constructor(_config?: unknown) {}
  async start() {}
  async stop() {}
  async isActive() { return false }
  getViolationStore() { return new SandboxViolationStore() }

  // Static methods required by sandbox-adapter.ts
  static isSupportedPlatform() { return false }
  static checkDependencies(_opts?: unknown): { errors: string[]; warnings: string[] } { return { errors: [], warnings: [] } }
  static async initialize(_config?: unknown, _callback?: unknown) {}
  static updateConfig(_config?: unknown) {}
  static async reset() {}
  static async wrapWithSandbox(fn: () => Promise<unknown>, ..._args: unknown[]) { return fn() }
  static getFsReadConfig() { return undefined }
  static getFsWriteConfig() { return undefined }
  static getNetworkRestrictionConfig() { return undefined }
  static getIgnoreViolations() { return undefined }
  static getAllowUnixSockets() { return true }
  static getAllowLocalBinding() { return true }
  static getEnableWeakerNestedSandbox() { return false }
  static getProxyPort() { return undefined }
  static getSocksProxyPort() { return undefined }
  static getLinuxHttpSocketPath() { return undefined }
  static getLinuxSocksSocketPath() { return undefined }
  static async waitForNetworkInitialization() {}
  static getSandboxViolationStore() { return new SandboxViolationStore() }
  static annotateStderrWithSandboxFailures(_stderr: string) { return _stderr }
  static async cleanupAfterCommand() {}
}

export default {}
