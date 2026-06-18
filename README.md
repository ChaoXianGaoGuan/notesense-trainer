# NoteSense 音感训练器

NoteSense 是一个纯前端 PWA 音乐基础训练器，用来练习音名、固定唱名、单音听辨、旋律短句听写、和弦性质听辨、音程速算、切分节奏和相对音高模唱。

项目不需要后端、不需要账号，也不依赖云同步。打开网页即可使用，安装成 PWA 后也可以离线使用。

## 在线访问

公开版本部署在 GitHub Pages：

```text
https://chaoxiangaoguan.github.io/notesense-trainer/
```

## 功能

- 看音名选唱名：根据 `C D E F G A B` 选择对应固定唱名 `do re mi fa sol la si`。
- 单音听辨：先听参考音或音阶，再判断目标音名。
- 旋律短句听写：听 2 到 5 个自然音组成的短句，输入对应音名。
- 和弦性质听辨：听琶音加齐响和弦，判断 Major、Minor、Diminished、Augmented。
- 根音冠音音程速算：支持算根音、算冠音、算音程和混合四种限时模式。
- 切分节奏跟拍：看简谱式或五线谱式四小节节奏型，在 2/4、3/4、4/4 中练习四分、二八、四十六、附点、小切分、三连音和大切分。小切分为十六分-八分-十六分，大切分为八分-四分-八分；大切分跨拍音使用延音线显示。每题保证出现当前难度重点素材，并可混入更早难度素材；可选择节拍器全程播放或仅播放预备拍，默认全程播放；普通手机视口分行显示，浏览器电脑模式下四小节保持同一行。
- 相对音高模唱：固定 C 大调，根据 121、12321 等数字序列模唱，浏览器用麦克风判断音高顺序。
- 调内级数和弦：给出大调和级数，用根音、升降号、和弦类型拼出该级和弦。
- 和弦所属大调：给出三和弦，选择所有包含该调内三和弦的大调。
- 真实采样音源：内置钢琴和吉他 mp3 采样，通过 Tone.js Sampler 播放。
- 本地统计：答题数、正确数、正确率、连续正确数保存在浏览器本地。
- 错题强化：单音听辨支持按难度隔离的错题复习队列。
- 快捷键：支持数字键答题、`P` 重播、`R` 重置统计、`Space` 下一题等。
- PWA：支持 GitHub Pages 部署、离线缓存和安装到桌面/手机主屏幕。

## 技术栈

- TypeScript：主要开发语言。
- Vite：前端构建工具。
- React：界面和交互。
- Tone.js：Web Audio 播放和采样器封装。
- 自定义 SVG 简谱渲染器：切分节奏跟拍的教学型简谱谱面。
- VexFlow：五线谱节奏型渲染。
- vite-plugin-pwa：生成 manifest 和 service worker。
- Vitest：单元测试。
- Playwright：端到端测试和响应式布局检查。
- localStorage：本机设置、统计和错题队列持久化。

## 文档

- [AI 接手指南](AGENTS.md)：给后续 AI 智能体的项目边界、修改规则和测试要求。
- [项目交接文档](docs/project-handoff.md)：当前状态、关键决策、已踩坑和后续优化方向。
- [架构说明](docs/architecture.md)：项目分层、数据流、状态和部署形态。
- [乐理规则](docs/music-theory.md)：音名拼写、大调集合、级数和弦、和弦所属大调规则。
- [部署说明](docs/deployment.md)：GitHub Pages workflow、常见问题和更新流程。
- [吉他实弹和弦验证计划](docs/future-guitar-chord-verification.md)：未来通过麦克风判断用户是否弹对目标和弦的设计草案，当前尚未实现。
- [更新记录](CHANGELOG.md)：版本变化和主要功能记录。
- [许可证](LICENSE)：项目代码使用 MIT License；内置音频采样见 `public/samples/ATTRIBUTION.md`。

如果你是新的 AI 智能体或第一次接手本项目，建议先阅读 `AGENTS.md` 和 `docs/project-handoff.md`。

## 项目结构

```text
src/
  app/       # React 应用入口、模块切换、全局快捷键、页面布局
  audio/     # Tone.js Sampler 封装，对 UI 暴露统一播放接口
  core/      # 纯音乐理论逻辑：音名、音程、和弦、随机选择
  modules/   # 五个训练模块的出题、判题和播放序列构造
  state/     # 默认设置、统计、错题队列、localStorage 持久化
  test/      # 测试环境配置

docs/        # 架构、乐理规则、部署说明
public/
  samples/   # 钢琴和吉他 mp3 采样，随项目发布并支持离线缓存

e2e/         # Playwright 端到端测试
```

## 架构说明

项目按“核心逻辑、业务模块、音频引擎、状态、界面”分层。

`core/` 只放纯函数，例如音名转换、音程计算、和弦构造。它不引用 React、不操作音频、不读写 localStorage。这样音乐理论相关逻辑可以独立测试。

切分节奏的简谱显示也有独立核心逻辑：`src/core/jianpu-rhythm.ts` 负责把节奏格转换成教学型简谱 layout，包括小节、拍点、符号位置、减时线、附点、三连音标记和反馈高亮。React 只渲染 layout 结果。

`modules/` 负责每个训练模式的业务规则，例如生成题目、构造播放序列、检查答案、决定统计 key。模块层仍然尽量不直接操作浏览器 API。

大调、级数和调内和弦等纯理论规则放在 `core/` 中，当前采用 15 个传统大调调号集合。

`audio/` 只负责声音播放。当前使用 Tone.js 的 `Sampler` 播放本地 mp3 采样，并暴露 `playNote`、`playTimedSequence`、`playChord`、`playArpeggioThenChord` 等接口。切分节奏跟拍使用独立节拍器点击声。UI 不直接接触 Tone.js 或 Web Audio。

`state/` 负责浏览器本地状态，包括用户偏好、统计、错题队列。当前使用 localStorage，后续如果要加云同步，可以优先从这一层扩展。

`app/` 是 React 界面层，负责模块切换、显示设置面板、接收用户输入、调用模块判题和调用音频引擎播放。

## 数据流

一次答题的大致流程：

```text
用户进入模块
  -> modules 生成题目
  -> app 显示题目并按需自动播放
  -> 用户选择或输入答案
  -> modules 判题
  -> state 更新统计或错题队列
  -> app 显示反馈
  -> 答对自动进入下一题，答错等待用户手动下一题
```

音频播放的大致流程：

```text
训练模块构造音符序列
  -> app 调用 audioEngine
  -> audioEngine 加载或复用 Tone.Sampler
  -> 播放 public/samples 中的本地 mp3 采样
```

## 音频方案

项目只保留两个真实采样音色：

- 钢琴：`public/samples/piano/`
- 吉他：`public/samples/guitar/`

采样文件来自 `tonejs-instruments`，代码许可证为 MIT，样本许可证为 CC-BY 3.0。来源说明放在：

```text
public/samples/ATTRIBUTION.md
```

项目源代码使用 MIT License。音频采样是第三方资源，不由项目代码许可证重新授权。

发布到 GitHub Pages 时，Vite 会自动根据仓库名调整资源路径，避免 mp3、manifest 和图标在子路径下加载失败。

## 本地使用

先安装 Node.js。进入项目目录后运行：

```bash
npm install
npm run dev
```

终端会显示一个本地地址，通常是：

```text
http://127.0.0.1:5173/
```

复制这个地址到浏览器打开即可使用。

## 常用命令

```bash
npm test
npm run build
npm run test:e2e
```

含义：

- `npm test`：运行单元测试。
- `npm run build`：生成生产版本到 `dist/`。
- `npm run test:e2e`：先构建，再用 Playwright 检查主要页面流程。

## 发布到 GitHub Pages

项目已经内置 GitHub Actions 部署配置：

```text
.github/workflows/deploy-pages.yml
```

上传到 GitHub 后：

1. 打开 GitHub 仓库页面。
2. 进入 `Settings`。
3. 左侧进入 `Pages`。
4. 在 `Build and deployment` 里，把 `Source` 选择为 `GitHub Actions`。
5. 回到仓库首页，进入 `Actions`。
6. 等待 `Deploy Pages` 工作流完成。

发布完成后，GitHub 会显示一个公开网址，格式通常是：

```text
https://你的用户名.github.io/仓库名/
```

建议仓库名使用：

```text
notesense-trainer
```

这样最终网址通常会是：

```text
https://你的用户名.github.io/notesense-trainer/
```

本项目当前发布地址是：

```text
https://chaoxiangaoguan.github.io/notesense-trainer/
```

## GitHub Pages 配置记录

这个项目在配置 Pages 时遇到过几个容易踩的坑，后续维护时可以优先检查这里。

1. Vite 子路径问题

   GitHub Pages 项目站点通常部署在 `/仓库名/` 下，不是网站根路径 `/`。如果 Vite 的 `base` 仍然是 `/`，构建后的 JS、CSS、PWA manifest、图标和 mp3 音源可能会请求到错误路径。

   当前处理方式在 `vite.config.ts` 中：本地开发使用 `/`，GitHub Actions 构建时根据 `GITHUB_REPOSITORY` 自动生成 `/${repositoryName}/`。

2. 采样音源路径问题

   音频采样不能写死成 `/samples/...`，否则在 GitHub Pages 子路径下会找不到文件。

   当前处理方式在 `src/audio/engine.ts` 中：使用 `import.meta.env.BASE_URL` 拼接 `public/samples` 路径。

3. `npm ci` 要求 lockfile 同步

   GitHub Actions 使用 `npm ci`，它比 `npm install` 更严格。如果 `package.json` 和 `package-lock.json` 不同步，workflow 会直接失败，并提示缺少依赖。

   修复方式是在本地运行：

   ```bash
   npm install
   npm ci
   ```

   确认通过后提交更新后的 `package-lock.json`。

4. GitHub Actions Node 20 弃用警告

   GitHub 正在把 JavaScript action 从 Node 20 迁移到 Node 24。旧版本 action 可能会出现 deprecation warning。

   当前处理方式是使用支持 Node 24 的新版 action：

   ```yaml
   actions/checkout@v6
   actions/setup-node@v6
   actions/configure-pages@v6
   actions/upload-pages-artifact@v5
   actions/deploy-pages@v5
   ```

5. Pages Source 要选择 GitHub Actions

   仓库的 `Settings -> Pages` 中，`Source` 必须选择 `GitHub Actions`。如果选择分支发布，当前 `.github/workflows/deploy-pages.yml` 不会接管部署。

## 更新网页

以后每次修改代码后，只需要提交并推送到 `main` 分支：

```bash
git add .
git commit -m "Update trainer"
git push
```

GitHub Actions 会自动重新构建并发布网页。

## 当前限制

- 没有用户账号。
- 没有云同步。
- 没有 MIDI 输入。
- 没有节奏听写。
- 没有自定义题库。
- 音源只保留钢琴和吉他。

这些限制是首版刻意保留的边界，目的是让项目先成为一个稳定、可分享、可离线使用的训练器。
