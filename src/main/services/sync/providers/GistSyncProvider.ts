import { SyncResult, SyncProviderConfig, ISyncProvider, SyncStatus } from '../ISyncProvider'
import { request } from 'https'
import { URL } from 'url'
import type { JsonValue, JsonObject } from '../../../../common/types/safe-json'

/**
 * 简单的 GitHub Gist 同步提供者实现（初版）
 * - 支持基于 token 的认证
 * - 提供 push/pull/listRemote/configure/getStatus
 * - 使用 Node 内置 https 发起请求（以减少新依赖）
 */
export class GistSyncProvider implements ISyncProvider {
  readonly name = 'github_gist'
  private token: string | null = null
  private lastStatus: SyncStatus = 'idle'

  constructor(config?: SyncProviderConfig) {
    if (config && typeof config['token'] === 'string') {
      this.token = config['token'] as string
    }
  }

  async init(config?: SyncProviderConfig): Promise<void> {
    if (config && typeof config['token'] === 'string') this.token = config['token'] as string
    // no other init steps for now
  }

  async configure(config: SyncProviderConfig): Promise<SyncResult> {
    if (config && typeof config['token'] === 'string') {
      this.token = config['token'] as string
      return { success: true, message: 'token saved' }
    }
    return { success: false, message: 'invalid config' }
  }

  async getStatus(): Promise<SyncStatus> {
    if (!this.token) return 'auth_required'
    return this.lastStatus
  }

  private async makeRequest<T extends JsonValue = JsonValue>(
    method: string,
    path: string,
    body?: JsonValue
  ): Promise<T> {
    const url = new URL(`https://api.github.com${path}`)
    const headers: Record<string, string> = {
      'User-Agent': 'PasswordManagerSync/1.0',
      Accept: 'application/vnd.github.v3+json'
    }
    if (this.token) headers['Authorization'] = `token ${this.token}`
    if (body) {
      headers['Content-Type'] = 'application/json'
    }

    return new Promise<T>((resolve, reject) => {
      const opts: {
        method: string
        hostname: string
        path: string
        headers: Record<string, string>
      } = {
        method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers
      }

      const req = request(opts, (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {}
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed as T)
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`))
            }
          } catch (e) {
            reject(e)
          }
        })
      })
      req.on('error', (e) => reject(e))
      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  }

  // 列出用户的 gists
  async listRemote(): Promise<SyncResult<JsonObject[]>> {
    try {
      if (!this.token) return { success: false, message: 'no token provided', data: [] }
      const res = await this.makeRequest<JsonObject[]>('GET', '/gists')
      return { success: true, data: res }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return { success: false, message, data: [] }
    }
  }

  // 从 gist 拉取内容（支持传入 gistId）
  // 存储约定：我们将整个加密数据库文件以 base64 字符串存入 gist 文件内容中。
  async pull(opts?: SyncProviderConfig): Promise<SyncResult<Buffer | string | null>> {
    try {
      if (!this.token) return { success: false, message: 'no token provided', data: null }
      const gistId = opts && typeof opts['gistId'] === 'string' ? (opts['gistId'] as string) : null
      if (!gistId) return { success: false, message: 'gistId required', data: null }

      const gist = await this.makeRequest<JsonObject>('GET', `/gists/${gistId}`)
      // 只支持第一个 file 的内容
      const files = (gist.files as JsonObject) || {}
      const keys = Object.keys(files)
      if (keys.length === 0) return { success: true, data: null }
      const first = files[keys[0]] as JsonObject
      const content = ((first && (first.content as string)) || '') as string

      // 尝试检测并解码 base64（允许内容包含换行）
      const normalized = content.replace(/\s+/g, '')
      const isBase64 =
        normalized.length > 0 &&
        normalized.length % 4 === 0 &&
        /^[A-Za-z0-9+/=]+$/.test(normalized)

      if (isBase64) {
        try {
          const decoded = Buffer.from(normalized, 'base64')
          return { success: true, data: decoded }
        } catch {
          // fallthrough to return utf8 buffer
        }
      }

      // 回退：按 utf8 文本返回（兼容旧格式）
      return { success: true, data: Buffer.from(content, 'utf8') }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return { success: false, message, data: null }
    }
  }

  // push：创建或更新 gist
  async push(localPayload: Buffer | string, opts?: SyncProviderConfig): Promise<SyncResult> {
    try {
      if (!this.token) return { success: false, message: 'no token provided' }
      const gistId = opts && typeof opts['gistId'] === 'string' ? (opts['gistId'] as string) : null
      const filename =
        (opts && typeof opts['filename'] === 'string' && opts['filename']) || 'passwords.dat'
      // If caller provided a Buffer (encrypted .enc), store it as base64 so it survives
      // transport as gist text and can be decoded back to a Buffer on pull.
      let content: string
      if (Buffer.isBuffer(localPayload)) {
        content = localPayload.toString('base64')
      } else if (typeof localPayload === 'string') {
        content = localPayload
      } else {
        // fallback: coerce to empty string to avoid sending non-string body
        content = ''
      }

      if (gistId) {
        // update
        const body: JsonObject = { files: { [filename]: { content } } }
        await this.makeRequest<JsonObject>('PATCH', `/gists/${gistId}`, body)
        return { success: true }
      }

      // create new gist (secret)
      const body: JsonObject = {
        files: { [filename]: { content } },
        description: 'PasswordManager sync',
        public: false
      }
      const created = await this.makeRequest<JsonObject>('POST', '/gists', body)
      const newId = typeof created.id === 'string' ? created.id : null
      return { success: true, data: newId }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      return { success: false, message }
    }
  }

  async dispose(): Promise<void> {
    // no-op
  }
}

export default GistSyncProvider
