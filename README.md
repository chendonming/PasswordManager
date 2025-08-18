# passwordmanager

# PasswordManager

这是一个基于 Electron + Vue 3 + TypeScript 的跨平台桌面密码管理器（开发中）。

本仓库包含主进程、渲染进程和预加载脚本的源代码，目标是提供一个安全、轻量且可扩展的本地密码管理解决方案。

## 功能概览

- 本地数据库存储（SQLite）用于持久化密码与元数据
- AES 加密 / 安全加密流程（通过 CryptoService 封装）
- 主/渲染进程分离，使用预加载脚本暴露受控 API
- 简洁的 Vue 组件化界面（暗色/浅色主题支持）
- 应用打包配置（为 Windows、macOS、Linux 构建安装包）

## 优点

- 数据默认保存在本地，减少云端泄露风险
- 基于成熟框架（Electron + Vue + TypeScript），开发体验和可维护性好
- 结构清晰：主进程负责 IO 与数据库，渲染进程专注 UI
- 可扩展性强：后续可接入同步、浏览器扩展或云备份

## 待开发 / 路线图

- [ ] 自动锁定（闲置超时后锁定应用）
- [ ] 主密码 / 密钥派生（PBKDF2 / Argon2）与更强的秘钥管理
- [ ] 安全导入/导出（加密备份与恢复）
- [ ] 多设备同步（端对端加密的云同步可选）
- [ ] 浏览器自动填充扩展
- [ ] 单元测试与端到端测试覆盖率提升

## 快速开始

先决条件：已安装 Node.js（16 及以上推荐）、npm 或 pnpm。如果要打包，请确保已安装相应平台的构建工具。

在仓库根目录执行：

```powershell
npm install
npm run dev
```

常用脚本（package.json 中配置）：

- `npm run dev`：开发模式（热重载）
- `npm run build:win`：为 Windows 打包
- `npm run build:mac`：为 macOS 打包
- `npm run build:linux`：为 Linux 打包

建议的 IDE：VS Code，安装 ESLint、Prettier、Volar 扩展以获得更好体验。

## 项目结构（摘要）

- `src/main`：Electron 主进程代码（数据库、服务）
- `src/preload`：预加载脚本，桥接主/渲染进程
- `src/renderer`：Vue 前端界面
- `src/common`：共享类型与工具

## 贡献指南

欢迎贡献：提 issue、提交 PR 或参与讨论。提交代码前请遵循以下约定：

- 保持代码风格一致（项目已配置 ESLint/Prettier）
- 新增功能请附带单元测试（如果涉及逻辑代码）
- 重大设计变更请先发起 issue 讨论

## 安全与隐私说明

本项目默认将所有用户数据保存在本地数据库。任何计划添加网络/云同步的功能都会以端到端加密为前提，并在文档中明确告知风险与配置项。

## 许可证

请在仓库中查看 `LICENSE`以了解许可信息；没有明确许可则默认保留所有权利。
