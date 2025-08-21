import ISyncProvider, { SyncProviderConfig, SyncResult, SyncStatus } from './ISyncProvider'
import type { JsonObject } from '../../../common/types/safe-json'

export class SyncManager {
  private providers: Map<string, ISyncProvider> = new Map()
  private activeProviderKey: string | null = null

  registerProvider(key: string, provider: ISyncProvider): void {
    if (this.providers.has(key)) throw new Error(`provider ${key} already registered`)
    this.providers.set(key, provider)
  }

  unregisterProvider(key: string): void {
    this.providers.delete(key)
    if (this.activeProviderKey === key) this.activeProviderKey = null
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  setActiveProvider(key: string): void {
    if (!this.providers.has(key)) throw new Error(`provider ${key} not found`)
    this.activeProviderKey = key
  }

  getActiveProvider(): ISyncProvider | null {
    if (!this.activeProviderKey) return null
    return this.providers.get(this.activeProviderKey) || null
  }

  async push(localPayload: Buffer | string, opts?: SyncProviderConfig): Promise<SyncResult> {
    const p = this.getActiveProvider()
    if (!p) return { success: false, message: 'no active provider' }
    return p.push(localPayload, opts)
  }

  async pull(opts?: SyncProviderConfig): Promise<SyncResult<Buffer | string | null>> {
    const p = this.getActiveProvider()
    if (!p) return { success: false, message: 'no active provider', data: null }
    return p.pull(opts)
  }

  async listRemote(opts?: SyncProviderConfig): Promise<SyncResult<JsonObject[]>> {
    const p = this.getActiveProvider()
    if (!p) return { success: false, message: 'no active provider', data: [] }
    return p.listRemote(opts)
  }

  async getStatus(): Promise<SyncStatus> {
    const p = this.getActiveProvider()
    if (!p) return 'unknown'
    return p.getStatus()
  }

  async configureActive(config: SyncProviderConfig): Promise<SyncResult> {
    const p = this.getActiveProvider()
    if (!p) return { success: false, message: 'no active provider' }
    return p.configure(config)
  }
}

export default SyncManager
