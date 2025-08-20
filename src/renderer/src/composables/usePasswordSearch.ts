import { computed, type ComputedRef } from 'vue'
import Fuse from 'fuse.js'

// 密码条目类型
interface Tag {
  id: number
  name: string
  color: string
}

interface DecryptedPasswordEntry {
  id: number
  title: string
  username?: string
  password: string
  url?: string
  description?: string
  is_favorite: boolean
  password_strength: number
  created_at: string
  updated_at: string
  last_used_at?: string
  tags: Tag[]
}

// 搜索选项接口
interface SearchOptions {
  threshold?: number
  includeMatches?: boolean
  includeScore?: boolean
  keys?: Array<{ name: string; weight: number } | string>
}

// 搜索结果接口
interface SearchResult {
  entries: DecryptedPasswordEntry[]
  totalResults: number
  searchType: 'fuzzy' | 'advanced' | 'none'
}

/**
 * 使用 Fuse.js 的密码搜索组合式函数
 * @param entries 密码条目数组
 * @param searchQuery 搜索查询字符串
 * @param options 搜索选项
 * @param useServerSearch 是否使用服务器端搜索结果（不再进行客户端过滤）
 * @returns 搜索结果的计算属性
 */
export function usePasswordSearch(
  entries: ComputedRef<DecryptedPasswordEntry[]>,
  searchQuery: ComputedRef<string>,
  options: SearchOptions = {},
  useServerSearch: ComputedRef<boolean> = computed(() => false)
): ComputedRef<SearchResult> {
  // 默认 Fuse.js 配置
  const defaultFuseOptions = {
    threshold: options.threshold ?? 0.3,
    keys: options.keys ?? [
      { name: 'title', weight: 0.4 },
      { name: 'username', weight: 0.3 },
      { name: 'url', weight: 0.2 },
      { name: 'description', weight: 0.1 },
      { name: 'tags.name', weight: 0.2 }
    ],
    includeMatches: options.includeMatches ?? true,
    includeScore: options.includeScore ?? true,
    minMatchCharLength: 1,
    ignoreLocation: true,
    findAllMatches: true
  }

  return computed(() => {
    const query = searchQuery.value.trim()

    if (!query) {
      return {
        entries: entries.value,
        totalResults: entries.value.length,
        searchType: 'none'
      }
    }

    // 如果使用服务器端搜索，直接返回条目（已经在服务器端过滤过了）
    if (useServerSearch.value) {
      return {
        entries: entries.value,
        totalResults: entries.value.length,
        searchType: 'fuzzy' // 假设服务器端使用模糊搜索
      }
    }

    // 检查高级搜索语法 (field:value)
    const advancedSearchPattern = /^(title|user|url|tag):(.+)$/i
    const match = query.match(advancedSearchPattern)

    if (match) {
      // 高级搜索：按特定字段搜索
      const [, field, searchTerm] = match
      const normalizedField = field.toLowerCase()
      const normalizedTerm = searchTerm.toLowerCase()

      const filteredEntries = entries.value.filter((entry) => {
        switch (normalizedField) {
          case 'title':
            return entry.title.toLowerCase().includes(normalizedTerm)
          case 'user':
            return entry.username?.toLowerCase().includes(normalizedTerm) ?? false
          case 'url':
            return entry.url?.toLowerCase().includes(normalizedTerm) ?? false
          case 'tag':
            return (
              entry.tags?.some((tag) => tag.name.toLowerCase().includes(normalizedTerm)) ?? false
            )
          default:
            return false
        }
      })

      return {
        entries: filteredEntries,
        totalResults: filteredEntries.length,
        searchType: 'advanced'
      }
    }

    // 使用 Fuse.js 进行模糊搜索
    const fuse = new Fuse(entries.value, defaultFuseOptions)
    const results = fuse.search(query)

    return {
      entries: results.map((result) => result.item),
      totalResults: results.length,
      searchType: 'fuzzy'
    }
  })
}

/**
 * 获取搜索建议
 * @param entries 密码条目数组
 * @param query 当前查询
 * @returns 搜索建议数组
 */
export function getSearchSuggestions(
  entries: DecryptedPasswordEntry[],
  query: string
): Array<{ type: string; value: string; count: number }> {
  if (!query || query.includes(':')) return []

  const normalizedQuery = query.toLowerCase()
  const suggestions: Array<{ type: string; value: string; count: number }> = []

  // 收集所有可能的搜索值
  const titleValues = new Set<string>()
  const userValues = new Set<string>()
  const urlValues = new Set<string>()
  const tagValues = new Set<string>()

  entries.forEach((entry) => {
    if (entry.title.toLowerCase().includes(normalizedQuery)) {
      titleValues.add(entry.title)
    }
    if (entry.username?.toLowerCase().includes(normalizedQuery)) {
      userValues.add(entry.username)
    }
    if (entry.url?.toLowerCase().includes(normalizedQuery)) {
      try {
        const domain = new URL(entry.url).hostname
        urlValues.add(domain)
      } catch {
        urlValues.add(entry.url)
      }
    }
    entry.tags?.forEach((tag) => {
      if (tag.name.toLowerCase().includes(normalizedQuery)) {
        tagValues.add(tag.name)
      }
    })
  })

  // 生成建议
  Array.from(titleValues)
    .slice(0, 3)
    .forEach((value) => {
      suggestions.push({ type: 'title', value, count: 1 })
    })

  Array.from(userValues)
    .slice(0, 3)
    .forEach((value) => {
      suggestions.push({ type: 'user', value, count: 1 })
    })

  Array.from(urlValues)
    .slice(0, 3)
    .forEach((value) => {
      suggestions.push({ type: 'url', value, count: 1 })
    })

  Array.from(tagValues)
    .slice(0, 3)
    .forEach((value) => {
      suggestions.push({ type: 'tag', value, count: 1 })
    })

  return suggestions.slice(0, 8) // 限制总建议数量
}

export { type DecryptedPasswordEntry, type SearchResult, type SearchOptions }
