<template>
  <div
    class="w-64 border-r flex flex-col bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
  >
    <!-- 用户信息区域 -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
            {{ userInfo.username || '用户' }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ userInfo.passwordCount || 0 }} 个密码
          </p>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="flex-1 p-4">
      <div class="space-y-1">
        <button
          v-for="item in navigationItems"
          :key="item.id"
          :class="[
            'w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
            activeTab === item.id
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          ]"
          @click="$emit('navigate', item.id)"
        >
          <component :is="getIconComponent(item.icon)" style="width: 1.25rem; height: 1.25rem" />
          <span>{{ item.label }}</span>
          <span
            v-if="item.count !== undefined"
            class="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {{ item.count }}
          </span>
        </button>
      </div>

      <!-- 标签分组 -->
      <div v-if="tags && tags.length > 0" class="pt-4">
        <div class="flex items-center justify-between mb-2">
          <h3
            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            标签
          </h3>
          <button
            class="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            title="添加标签"
            @click="$emit('add-tag')"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>
        <div class="space-y-1">
          <div
            v-for="tag in tags"
            :key="tag.id"
            :class="[
              'w-full flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg transition-colors duration-200',
              props.activeTagId === tag.id
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            <button
              class="flex-1 text-left flex items-center space-x-2"
              @click="$emit('filter-by-tag', tag.id)"
            >
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: tag.color }"></div>
              <span class="flex-1 text-left text-gray-700 dark:text-gray-200">{{ tag.name }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ tag.count || 0 }}</span>
            </button>

            <!-- 编辑/删除按钮：大屏显示，窄屏隐藏 -->
            <div class="flex items-center space-x-1 ml-2">
              <button
                class="hidden sm:flex w-6 h-6 items-center justify-center text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                title="编辑标签"
                @click="$emit('edit-tag', tag)"
              >
                <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M17.414 2.586a2 2 0 010 2.828l-9.192 9.192a1 1 0 01-.464.263l-4 1a1 1 0 01-1.212-1.212l1-4a1 1 0 01.263-.464l9.192-9.192a2 2 0 012.828 0z"
                  />
                </svg>
              </button>
              <button
                class="hidden sm:flex w-6 h-6 items-center justify-center text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                title="删除标签"
                @click="$emit('delete-tag', tag.id)"
              >
                <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H3a1 1 0 100 2h14a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 7a1 1 0 10-2 0v6a1 1 0 102 0V9zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>

              <!-- 小屏菜单按钮 -->
              <div class="relative sm:hidden">
                <button
                  class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="更多"
                  @click="openMenuId = openMenuId === tag.id ? null : tag.id"
                >
                  <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </button>

                <!-- 菜单弹出 -->
                <div
                  v-if="openMenuId === tag.id"
                  class="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20"
                >
                  <button
                    class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    @click="$emit('edit-tag', tag)"
                  >
                    编辑
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                    @click="$emit('delete-tag', tag.id)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- 底部操作区域 -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <div class="space-y-2">
        <button
          class="w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-200 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="$emit('sync')"
        >
          <svg
            style="width: 1.5rem; height: 1.5rem"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 12a8 8 0 018-8V2.5L16 6l-4 3.5V8a6 6 0 100 12c1.657 0 3.157-.672 4.243-1.757"
            />
          </svg>
          <span>同步数据</span>
        </button>

        <button
          class="w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors duration-200 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="$emit('settings')"
        >
          <svg
            style="width: 1.5rem; height: 1.5rem"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
            />
          </svg>
          <span>设置</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// 定义 props
interface Props {
  activeTab?: string
  userInfo?: {
    username?: string
    passwordCount?: number
  }
  activeTagId?: number | null
  tags?: Array<{
    id: number
    name: string
    color: string
    count?: number
  }>
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'all',
  userInfo: () => ({ username: '用户', passwordCount: 0 }),
  tags: () => [],
  activeTagId: null
})

// 用于小屏幕的标签操作菜单
const openMenuId = ref<number | null>(null)

// 定义 emits
defineEmits<{
  navigate: [tabId: string]
  'filter-by-tag': [tagId: number]
  'add-tag': []
  'edit-tag': [tag: { id: number; name: string; color: string; count?: number }]
  'delete-tag': [id: number]
  sync: []
  settings: []
}>()

// 导航项配置
const navigationItems = computed(() => [
  {
    id: 'all',
    label: '全部密码',
    icon: 'KeyIcon',
    count: props.userInfo?.passwordCount
  },
  {
    id: 'favorites',
    label: '收藏夹',
    icon: 'StarIcon'
  },
  {
    id: 'recent',
    label: '最近使用',
    icon: 'ClockIcon'
  },
  {
    id: 'generator',
    label: '密码生成器',
    icon: 'CogIcon'
  },
  {
    id: 'security',
    label: '安全检查',
    icon: 'ShieldIcon'
  },
  {
    id: 'sync',
    label: '同步',
    icon: 'SyncIcon'
  }
])

// 图标组件映射
const iconComponents = {
  KeyIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z"/>
      </svg>
    `
  },
  StarIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
      </svg>
    `
  },
  ClockIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    `
  },
  CogIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1 1 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1 1 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1 1 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1 1 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1 1 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1 1 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    `
  },
  ShieldIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    `
  },
  SyncIcon: {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10a9 9 0 0115-6l3 3m0 0v-6m0 6h-6M21 14a9 9 0 01-15 6l-3-3m0 0v6m0-6h6"/>
      </svg>
    `
  }
}

// 动态获取图标组件
const getIconComponent = (iconName: string): object => {
  return iconComponents[iconName as keyof typeof iconComponents] || iconComponents.KeyIcon
}
</script>
