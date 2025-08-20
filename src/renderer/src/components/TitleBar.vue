<template>
  <div
    class="h-12 border-b flex items-center justify-between px-4 drag-region bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
  >
    <!-- 应用标题和图标 -->
    <div class="flex items-center space-x-3 no-drag">
      <div
        class="w-6 h-6 bg-blue-600 dark:bg-blue-500 rounded-md flex items-center justify-center shadow-sm"
      >
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <span class="text-sm font-semibold text-gray-700 dark:text-gray-200"> 密码管理器 </span>

      <!-- 菜单栏 -->
      <MenuBar
        @import="handleImport"
        @export="handleExport"
        @tool="handleTool"
        @help="handleHelp"
      />
    </div>

    <!-- 搜索框 -->
    <div class="flex-1 max-w-md mx-8 no-drag relative">
      <div class="relative">
        <svg
          class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="搜索密码... (? 查看帮助)"
          :class="[
            'w-full pl-10 pr-10 py-1.5 text-sm border-0 rounded-lg transition-all duration-200',
            'dark:text-white dark:placeholder-gray-400',
            searchSuggestions.length > 0 && searchQuery.trim()
              ? 'bg-blue-50 dark:bg-blue-900/20 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500'
              : 'text-gray-900 bg-gray-100 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:ring-1 focus:ring-blue-500'
          ]"
          @input="handleSearchInput"
          @focus="handleFocus"
          @blur="hideSearchHelp"
          @keydown="handleKeydown"
        />
        <!-- 搜索帮助按钮 -->
        <button
          class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-150"
          title="搜索帮助"
          @click="toggleSearchHelp"
        >
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <!-- 搜索帮助提示 -->
      <SearchHelp :show-help="showSearchHelp && !searchQuery.trim()" />

      <!-- 搜索建议 -->
      <div
        v-if="searchSuggestions.length > 0 && searchQuery.trim()"
        ref="suggestionList"
        class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-40 overflow-y-auto"
      >
        <div
          class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
        >
          搜索建议 ({{ searchSuggestions.length }})
        </div>
        <div
          v-for="(suggestion, index) in searchSuggestions"
          :key="index"
          :ref="(el) => setSuggestionRef(el, index)"
          :class="[
            'px-3 py-2 cursor-pointer text-sm transition-colors duration-150 border-l-2',
            selectedSuggestionIndex === index
              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-900 dark:text-blue-100'
              : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500'
          ]"
          @click="applySuggestion(suggestion)"
          @mouseenter="selectedSuggestionIndex = index"
        >
          <span class="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide"
            >{{ suggestion.type }}:</span
          >
          <span class="ml-2 text-gray-900 dark:text-white font-medium">{{ suggestion.value }}</span>
        </div>
      </div>
    </div>

    <!-- 窗口控制按钮 -->
    <div class="flex items-center space-x-1 no-drag">
      <!-- 主题切换按钮 -->
      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer hover:scale-110 active:scale-95"
        title="切换主题"
        @click="$emit('toggle-theme')"
      >
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-400 dark:hidden"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <!-- 月亮图标 (深色主题) -->
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-400 hidden dark:block"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <!-- 太阳图标 (浅色主题) -->
          <path
            fill-rule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
        title="最小化"
        @click="minimizeWindow"
      >
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
        title="最大化"
        @click="maximizeWindow"
      >
        <svg
          class="w-4 h-4 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 8V4m0 0h4m-4 0l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
        title="关闭"
        @click="closeWindow"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import MenuBar from './MenuBar.vue'
import SearchHelp from './SearchHelp.vue'

// 定义搜索建议类型
interface SearchSuggestion {
  type: string
  value: string
}

// 定义 props 来接收密码数据用于生成建议
interface Props {
  entries?: Array<{
    id: number
    title: string
    username?: string
    url?: string
    tags?: Array<{ name: string }>
  }>
}

const props = withDefaults(defineProps<Props>(), {
  entries: () => []
})

// 定义 emits
const emit = defineEmits<{
  search: [query: string]
  'toggle-theme': []
  import: [format: string]
  export: [format: string]
  tool: [action: string]
  help: [action: string]
}>()

// 响应式数据
const searchQuery = ref('')
const showSearchHelp = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const suggestionList = ref<HTMLDivElement | null>(null)
const suggestionRefs = ref<(HTMLDivElement | null)[]>([])
const selectedSuggestionIndex = ref(-1)
let searchHelpTimeout: number | null = null
let searchDebounceTimeout: number | null = null

// 搜索建议数据
const searchSuggestions = computed((): SearchSuggestion[] => {
  if (!searchQuery.value || searchQuery.value.includes(':')) return []

  const query = searchQuery.value.toLowerCase()
  const suggestions: SearchSuggestion[] = []

  // 从实际数据中生成智能建议
  if (props.entries.length > 0) {
    const titleMatches = new Set<string>()
    const userMatches = new Set<string>()
    const urlMatches = new Set<string>()
    const tagMatches = new Set<string>()

    props.entries.forEach((entry) => {
      if (entry.title.toLowerCase().includes(query)) {
        titleMatches.add(entry.title)
      }
      if (entry.username?.toLowerCase().includes(query)) {
        userMatches.add(entry.username)
      }
      if (entry.url) {
        try {
          const domain = new URL(entry.url).hostname
          if (domain.toLowerCase().includes(query)) {
            urlMatches.add(domain)
          }
        } catch {
          if (entry.url.toLowerCase().includes(query)) {
            urlMatches.add(entry.url)
          }
        }
      }
      entry.tags?.forEach((tag) => {
        if (tag.name.toLowerCase().includes(query)) {
          tagMatches.add(tag.name)
        }
      })
    })

    // 按匹配数量排序并添加到建议中
    Array.from(titleMatches)
      .slice(0, 2)
      .forEach((title) => {
        suggestions.push({ type: 'title', value: title })
      })
    Array.from(userMatches)
      .slice(0, 2)
      .forEach((username) => {
        suggestions.push({ type: 'user', value: username })
      })
    Array.from(urlMatches)
      .slice(0, 2)
      .forEach((url) => {
        suggestions.push({ type: 'url', value: url })
      })
    Array.from(tagMatches)
      .slice(0, 2)
      .forEach((tag) => {
        suggestions.push({ type: 'tag', value: tag })
      })
  } else {
    // 常用搜索字段建议（当没有数据时）
    const fields = ['title', 'user', 'url', 'tag']
    fields.forEach((field) => {
      if (field.includes(query)) {
        suggestions.push({ type: field, value: `${query}` })
      }
    })
  }

  return suggestions.slice(0, 6) // 限制建议数量
})

// 搜索相关方法
const handleSearchInput = (): void => {
  // 当用户开始输入时，隐藏搜索帮助并重置选择
  if (searchQuery.value.trim() !== '' && showSearchHelp.value) {
    showSearchHelp.value = false
  }
  selectedSuggestionIndex.value = -1

  // 防抖处理，避免频繁触发搜索
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout)
  }
  searchDebounceTimeout = window.setTimeout(() => {
    emit('search', searchQuery.value)
  }, 300) // 300ms 防抖延迟
}

const toggleSearchHelp = (): void => {
  showSearchHelp.value = !showSearchHelp.value
}

const handleFocus = (): void => {
  // 只在输入框为空时显示帮助
  if (!searchQuery.value.trim()) {
    showSearchHelp.value = true
  }
}

const hideSearchHelp = (): void => {
  if (searchHelpTimeout) {
    clearTimeout(searchHelpTimeout)
  }
  searchHelpTimeout = window.setTimeout(() => {
    showSearchHelp.value = false
    selectedSuggestionIndex.value = -1
  }, 150) // 延迟隐藏，允许点击建议
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === '?') {
    event.preventDefault()
    // 切换帮助显示，但优先级低于搜索建议
    if (!searchQuery.value.trim()) {
      toggleSearchHelp()
    }
  }
  if (event.key === 'Escape') {
    // ESC 键隐藏帮助和建议，重置选择
    showSearchHelp.value = false
    selectedSuggestionIndex.value = -1
    if (!searchQuery.value.trim()) {
      searchInput.value?.blur()
    }
  }

  // 键盘导航处理
  if (searchSuggestions.value.length > 0 && searchQuery.value.trim()) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (selectedSuggestionIndex.value < searchSuggestions.value.length - 1) {
        selectedSuggestionIndex.value++
        scrollToSelectedSuggestion()
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (selectedSuggestionIndex.value > 0) {
        selectedSuggestionIndex.value--
        scrollToSelectedSuggestion()
      } else if (selectedSuggestionIndex.value === 0) {
        // 回到搜索框
        selectedSuggestionIndex.value = -1
        searchInput.value?.focus()
      }
    } else if (event.key === 'Enter' && selectedSuggestionIndex.value >= 0) {
      event.preventDefault()
      const selectedSuggestion = searchSuggestions.value[selectedSuggestionIndex.value]
      if (selectedSuggestion) {
        applySuggestion(selectedSuggestion)
      }
    }
  }
}

// 设置建议项 ref
const setSuggestionRef = (el: Element | ComponentPublicInstance | null, index: number): void => {
  if (el) {
    suggestionRefs.value[index] = el as HTMLDivElement
  }
}

// 滚动到选中的建议项
const scrollToSelectedSuggestion = (): void => {
  if (selectedSuggestionIndex.value >= 0 && suggestionRefs.value[selectedSuggestionIndex.value]) {
    const selectedElement = suggestionRefs.value[selectedSuggestionIndex.value]
    if (selectedElement && suggestionList.value) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }
}

const applySuggestion = (suggestion: SearchSuggestion): void => {
  searchQuery.value = `${suggestion.type}:${suggestion.value}`
  emit('search', searchQuery.value)
  showSearchHelp.value = false
  selectedSuggestionIndex.value = -1
  // 保持输入框焦点，方便用户继续编辑
  searchInput.value?.focus()
}

// MenuBar 事件处理
const handleImport = (format: string): void => {
  emit('import', format)
}

const handleExport = (format: string): void => {
  emit('export', format)
}

const handleTool = (action: string): void => {
  emit('tool', action)
}

const handleHelp = (action: string): void => {
  emit('help', action)
}

// 窗口控制方法
const minimizeWindow = (): void => {
  console.log('最小化窗口')
  window.api.minimizeWindow()
}

const maximizeWindow = (): void => {
  console.log('最大化窗口')
  window.api.maximizeWindow()
}

const closeWindow = (): void => {
  console.log('关闭窗口')
  window.api.closeWindow()
}
</script>

<style>
.drag-region {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}
</style>
