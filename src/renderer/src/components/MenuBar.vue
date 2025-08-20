<!-- MenuBar.vue - 数据驱动的菜单栏组件 -->
<template>
  <div class="flex items-center space-x-1 text-sm no-drag">
    <!-- 动态渲染菜单项 -->
    <div
      v-for="menu in menuConfig"
      :key="menu.id"
      :ref="
        (el) => {
          if (el && menu.id) menuRefs[menu.id] = el as HTMLElement
        }
      "
      class="relative"
    >
      <button
        :class="[
          'px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 cursor-pointer active:scale-95',
          activeMenu === menu.id ? 'bg-gray-100 dark:bg-gray-700' : ''
        ]"
        @click="toggleMenu(menu.id)"
        @mouseenter="handleMenuEnter(menu.id)"
      >
        {{ menu.label }}
      </button>

      <!-- 下拉菜单 -->
      <div
        v-if="activeMenu === menu.id"
        :class="[
          'absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50',
          menu.width || 'w-48'
        ]"
        @mouseenter="handleMenuEnter(menu.id)"
        @mouseleave="handleMenuLeave"
      >
        <div class="py-1">
          <!-- 渲染菜单项 -->
          <template v-for="(item, index) in menu.items" :key="`${menu.id}-${index}`">
            <!-- 分隔线 -->
            <hr v-if="item.type === 'divider'" class="my-1 border-gray-200 dark:border-gray-600" />

            <!-- 子菜单 -->
            <div v-else-if="item.type === 'submenu'" class="relative group">
              <button
                :class="[
                  'w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-all duration-150 cursor-pointer',
                  item.disabled ? 'text-gray-400 cursor-not-allowed' : ''
                ]"
                :disabled="item.disabled"
                @mouseenter="item.id && handleSubmenuEnter(item.id)"
                @mouseleave="handleMouseLeave"
              >
                <span class="flex items-center space-x-2">
                  <span v-if="item.icon">{{ item.icon }}</span>
                  <span>{{ item.label }}</span>
                </span>
                <span v-if="item.children">▶</span>
              </button>

              <!-- 子菜单项 -->
              <div
                v-if="showSubmenu === item.id && item.children"
                :class="[
                  'absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg',
                  item.submenuWidth || 'w-56'
                ]"
                @mouseenter="item.id && handleSubmenuEnter(item.id)"
                @mouseleave="handleMouseLeave"
              >
                <div class="py-1">
                  <template
                    v-for="(subItem, subIndex) in item.children"
                    :key="`${item.id}-${subIndex}`"
                  >
                    <!-- 子菜单分隔线 -->
                    <hr
                      v-if="subItem.type === 'divider'"
                      class="my-1 border-gray-200 dark:border-gray-600"
                    />

                    <!-- 子菜单项 -->
                    <button
                      v-else
                      :class="[
                        'w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-all duration-150 cursor-pointer active:scale-95',
                        subItem.disabled ? 'text-gray-400 cursor-not-allowed' : '',
                        subItem.dangerous
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : ''
                      ]"
                      :disabled="subItem.disabled"
                      @click="handleMenuAction(subItem)"
                    >
                      <span v-if="subItem.icon" :class="subItem.iconClass">{{ subItem.icon }}</span>
                      <div>
                        <div
                          :class="[
                            'font-medium',
                            subItem.dangerous ? 'text-red-600 dark:text-red-400' : ''
                          ]"
                        >
                          {{ subItem.label }}
                        </div>
                        <div
                          v-if="subItem.description"
                          :class="[
                            'text-xs',
                            subItem.dangerous
                              ? 'text-red-500 dark:text-red-400'
                              : 'text-gray-500 dark:text-gray-400'
                          ]"
                        >
                          {{ subItem.description }}
                        </div>
                      </div>
                    </button>
                  </template>
                </div>
              </div>
            </div>

            <!-- 普通菜单项 -->
            <button
              v-else
              :class="[
                'w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-all duration-150 cursor-pointer active:scale-95',
                item.disabled ? 'text-gray-400 cursor-not-allowed' : ''
              ]"
              :disabled="item.disabled"
              @click="handleMenuAction(item)"
            >
              <span v-if="item.icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { defaultMenuConfig, type MenuItem, type MenuConfig } from '../config/menuConfig'

// 定义组件事件
const emit = defineEmits<{
  import: [format: string]
  export: [format: string]
  tool: [action: string]
  help: [action: string]
}>()

// Props
interface Props {
  menuConfig?: MenuConfig[]
}

const props = withDefaults(defineProps<Props>(), {
  menuConfig: () => defaultMenuConfig
})

// 响应式数据
const activeMenu = ref<string | null>(null)
const showSubmenu = ref<string | null>(null)
const menuRefs = reactive<Record<string, HTMLElement>>({})
const mouseLeaveTimer = ref<number | null>(null)
const submenuMouseLeaveTimer = ref<number | null>(null)

// 使用props中的菜单配置或默认配置
const menuConfig = props.menuConfig

// 菜单切换逻辑
const toggleMenu = (menu: string): void => {
  if (activeMenu.value === menu) {
    activeMenu.value = null
  } else {
    activeMenu.value = menu
    showSubmenu.value = null
  }
}

// 改进的鼠标交互处理
const handleMouseLeave = (): void => {
  // 延迟隐藏子菜单，给用户时间移动到子菜单
  submenuMouseLeaveTimer.value = window.setTimeout(() => {
    showSubmenu.value = null
  }, 200)
}

const handleMenuEnter = (menuId: string): void => {
  // 清除主菜单隐藏定时器
  if (mouseLeaveTimer.value) {
    clearTimeout(mouseLeaveTimer.value)
    mouseLeaveTimer.value = null
  }
  activeMenu.value = menuId
}

const handleMenuLeave = (): void => {
  // 延迟隐藏主菜单
  mouseLeaveTimer.value = window.setTimeout(() => {
    activeMenu.value = null
    showSubmenu.value = null
  }, 300)
}

const handleSubmenuEnter = (submenuId: string): void => {
  // 清除子菜单隐藏定时器
  if (submenuMouseLeaveTimer.value) {
    clearTimeout(submenuMouseLeaveTimer.value)
    submenuMouseLeaveTimer.value = null
  }
  showSubmenu.value = submenuId
}

// 菜单项点击处理
const handleMenuAction = (item: MenuItem): void => {
  if (!item.action || !item.actionType || item.disabled) {
    return
  }

  switch (item.actionType) {
    case 'import':
      emit('import', item.action)
      break
    case 'export':
      emit('export', item.action)
      break
    case 'tool':
      emit('tool', item.action)
      break
    case 'help':
      emit('help', item.action)
      break
  }

  // 关闭菜单
  activeMenu.value = null
  showSubmenu.value = null
}

// 点击外部关闭菜单
const handleClickOutside = (event: Event): void => {
  const target = event.target as HTMLElement

  const isInsideMenu = Object.values(menuRefs).some((ref) => ref && ref.contains(target))

  if (!isInsideMenu) {
    activeMenu.value = null
    showSubmenu.value = null
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)

  // 清理定时器防止内存泄漏
  if (mouseLeaveTimer.value) {
    clearTimeout(mouseLeaveTimer.value)
  }
  if (submenuMouseLeaveTimer.value) {
    clearTimeout(submenuMouseLeaveTimer.value)
  }
})
</script>

<style scoped>
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
