# AI 接手指南

本文件给后续 AI 智能体或自动化编程代理阅读。目标是让它在没有聊天记录的情况下，也能安全继续维护 NoteSense。

## 项目目标

NoteSense 是一个纯前端 PWA 音乐基础训练器。它运行在浏览器里，不需要后端、账号或云同步。

公开地址：

```text
https://chaoxiangaoguan.github.io/notesense-trainer/
```

主要技术栈：

- TypeScript
- Vite
- React
- Tone.js
- vite-plugin-pwa
- Vitest
- Playwright
- localStorage

## 优先阅读顺序

接手前按顺序阅读：

1. `README.md`
2. `AGENTS.md`
3. `docs/project-handoff.md`
4. `docs/architecture.md`
5. `docs/music-theory.md`
6. `docs/deployment.md`
7. 需要修改的源码模块

## 目录边界

`src/core/`

- 只放纯音乐理论和纯函数。
- 不引用 React。
- 不引用 Tone.js。
- 不读写 localStorage。
- 不访问 DOM。
- 乐理边界变化必须同步更新 `docs/music-theory.md` 和测试。

`src/modules/`

- 放训练模块的业务流程：生成题目、构造答案、判题、统计 key。
- 尽量保持可单元测试。
- 不直接操作 UI 状态。

`src/audio/`

- 只通过 `audioEngine` 暴露播放接口。
- UI 不要直接使用 Tone.js。
- 采样路径必须使用 Vite base path，不能写死成 `/samples/...`。

`src/state/`

- 管理默认偏好、localStorage 兼容、统计和错题队列。
- 新增设置时必须更新 `DEFAULT_PREFERENCES` 和 `normalizePreferences`。

`src/app/`

- React UI、模块切换、快捷键、计时器和反馈状态。
- 不要把复杂乐理规则写在 UI 组件里。

## 固定产品决策

除非用户明确要求改变，否则不要改这些边界：

- 固定唱名：`C D E F G A B = do re mi fa sol la si`。
- 大调集合：15 个传统大调调号。
- 大调调内三和弦：I 大三、ii 小三、iii 小三、IV 大三、V 大三、vi 小三、vii° 减三。
- “和弦所属大调”按调内三和弦判断，不按任意三个音同属音阶判断。
- 理论模块不显示音频设置。
- 音源首版只保留钢琴和吉他。
- 音频采样来自 `tonejs-instruments`，归因见 `public/samples/ATTRIBUTION.md`。
- GitHub Pages 站点部署在 `/notesense-trainer/` 子路径。

## 当前模块

顶部模块包括：

- 看音名选唱名
- 单音听辨
- 旋律短句听写
- 和弦性质听辨
- 根音冠音音程速算
- 切分节奏跟拍
- 调内级数和弦
- 和弦所属大调

音频设置只应出现在需要发声的模块：

- 看音名选唱名
- 单音听辨
- 旋律短句听写
- 和弦性质听辨

以下模块不显示钢琴/吉他音频设置：

- 根音冠音音程速算
- 切分节奏跟拍
- 调内级数和弦
- 和弦所属大调

## 修改规则

新增训练模块时：

1. 先把纯规则放到 `core/` 或 `modules/`。
2. 扩展 `ModuleId`、`AppPreferences`、`StatsKey`。
3. 更新 `DEFAULT_PREFERENCES` 和 `normalizePreferences`。
4. 在 `App.tsx` 接入 UI。
5. 补 Vitest。
6. 如涉及页面流程，补 Playwright。
7. 更新 README 或 docs。

修改乐理规则时：

1. 更新 `docs/music-theory.md`。
2. 更新相关核心测试。
3. 不要只改 UI 文案。

修改部署、PWA、资源路径时：

1. 检查 `vite.config.ts` 的 base path。
2. 检查 mp3、manifest、icon 是否仍能在 GitHub Pages 子路径加载。
3. 更新 `docs/deployment.md`。

## 测试要求

常规代码改动后至少运行：

```bash
npm test
npm run build
```

涉及 UI、模块切换、快捷键、倒计时、PWA 或 GitHub Pages 配置时运行：

```bash
npm run test:e2e
```

如果只改 Markdown 文档，可以只运行：

```bash
npm test
npm run build
```

## 常见坑

- `npm ci` 要求 `package.json` 和 `package-lock.json` 完全同步。
- PWA 或浏览器缓存可能导致用户看到旧版本，验收时可提示 `Ctrl + F5`。
- GitHub Pages 项目站点不是根路径，不能写死根路径资源。
- Tone.js 自动播放可能被浏览器限制，用户点击重播后通常恢复。
- 速算倒计时切换模式或下一题时必须清理旧 timer，避免重复计分。
- localStorage 已有旧偏好时，新增字段必须有默认值和兼容逻辑。

## 提交习惯

提交前确认：

```bash
git status --short
```

提交信息用英文短句即可，例如：

```text
Add major key theory trainers
Refine interval quality answer UI
Add project documentation
```

推送到 `main` 后 GitHub Actions 会自动部署 Pages。
