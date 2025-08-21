import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
// @ts-ignore: type resolution for @vitejs/plugin-vue requires "moduleResolution" to be node16/nodenext; ignore here
import vue from '@vitejs/plugin-vue'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      {
        name: 'copy-sql-files',
        buildEnd() {
          // 复制 schema.sql 文件到输出目录
          const srcPath = resolve('src/main/database/schema.sql')
          const destPath = resolve('out/main/database/schema.sql')

          // 确保目标目录存在
          const destDir = dirname(destPath)
          if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true })
          }

          // 复制文件
          try {
            copyFileSync(srcPath, destPath)
            console.log('已复制 schema.sql 到输出目录')
          } catch (error) {
            console.error('复制 schema.sql 失败:', error)
          }
        }
      }
    ]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@common': resolve('src/common')
      }
    },
    plugins: [vue()]
  }
})
