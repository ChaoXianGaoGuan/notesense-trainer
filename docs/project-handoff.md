# Project Handoff

本文用于在换电脑、换 AI 智能体或重新克隆仓库后快速恢复上下文。

## 当前项目是什么

NoteSense 是一个纯前端 PWA 音乐基础训练器。

公开地址：

```text
https://chaoxiangaoguan.github.io/notesense-trainer/
```

GitHub 仓库：

```text
https://github.com/ChaoXianGaoGuan/notesense-trainer
```

项目当前不需要后端、不需要账号、不做云同步。数据只保存在用户浏览器 localStorage 中。

## 为什么是 PWA

首版选择 PWA，而不是 Tauri 或桌面应用，原因是：

- 用户只需要打开网址即可使用。
- GitHub Pages 可以免费公开部署。
- 音频、统计、错题队列都可以在浏览器本地完成。
- 后续如果需要桌面端，可以再用 Tauri 封装现有前端。

## 当前训练模块

1. 看音名选唱名

   显示自然音名，选择固定唱名。用户选择时播放对应音高。

2. 单音听辨

   播放参考音、音阶或目标音，用户判断目标音名。支持错题强化队列。

3. 旋律短句听写

   播放 2 到 5 个自然音组成的旋律，用户输入音名序列。

4. 和弦性质听辨

   播放琶音加齐响和弦，用户判断 Major、Minor、Diminished、Augmented。

5. 根音冠音音程速算

   纯理论限时模块。支持四种模式：

   - 算冠音：给根音和音程。
   - 算根音：给冠音和音程。
   - 算音程：给根音和冠音。
   - 混合：随机缺一项。

   音名答案使用两行选择：自然音 + 升降还原。音程答案使用两行选择：度数 + 性质。
   速算训练只覆盖 2-7 度，不生成减八度、纯八度或增八度。核心理论层仍保留八度用于内部计算。

6. 切分节奏跟拍

   看简谱式或五线谱式节奏型，跟着节拍器用 `Space` 或屏幕按钮拍击。当前固定每题 4 小节，可选 2/4、3/4、4/4，支持 60/80/100 bpm 和 8 个累积素材难度：四分音符、二八节奏、四十六节奏、前八后十六与前十六后八、前附点与后附点、小切分、三连音、大切分。小切分定义为十六分-八分-十六分，占一拍；大切分定义为八分-四分-八分，占两拍，中间跨拍音在渲染层拆成两个八分音并用延音线连接，但判题仍只保留原始 attack。每题前 3 小节保证出现当前难度的重点素材，其余位置才混入当前或更早难度的素材；前后两类混合训练会在同一题中覆盖两种节奏型。每题至少包含 1 个休止符。节拍器支持 `全程播放` 和 `仅预备拍`，默认全程播放；正式阶段只播放拍点，不播放标准节奏答案。默认输入校准为 `-140ms`，提示用户空格可能有约 140ms 延迟。该模块使用节拍器点击声，不显示钢琴/吉他音频设置。

   简谱显示使用自定义教学型 SVG renderer，而不是字符串或临时 UI 网格。核心在 `src/core/jianpu-rhythm.ts`：它把节奏格转换成结构化 glyph、减时线段、小节线、拍点线和高亮 box。布局按浏览器实际报告的视口宽度调整：普通手机竖屏每行 1 小节，中等宽度每行 2 小节，桌面或手机浏览器“电脑模式”每行 4 小节。教学模式下，同一拍内短音可连接减时线，跨拍默认断开；短休止符 `0` 也按八分/十六分显示下横线。准备状态不显示密集的逐拍反馈格，只有示范、回放或判题时才显示反馈。

7. 相对音高模唱

   固定 `1 = C`，根据 `121`、`12321` 等数字序列模唱。首版支持两个音到七个音、往上/往下/混合、按表顺序/随机出题。用户听参考 do 后用麦克风唱，程序只判断音高顺序，不判断节奏、力度或唱名发音。该模块显示钢琴/吉他音频设置，用于播放 do 和标准答案。

8. 调内级数和弦

   给出大调和级数，用户用根音、升降号、和弦类型拼出具体和弦。

9. 和弦所属大调

   给出三和弦三个音，用户多选所有包含该三和弦作为调内三和弦的大调。无匹配时选择“无符合大调”。

## 关键乐理决策

- 固定唱名，不使用首调唱名。
- 大调训练使用 15 个传统调号，不使用 17 个主音命名方案。
- 音程计算同时考虑字母距离和半音距离。
- `C -> E` 和 `C -> Fb` 必须区分为不同音程。
- 调内级数和弦只使用自然大调的 I、ii、iii、IV、V、vi、vii°。
- 和弦所属大调按调内三和弦判断，不按三个音是否都出现在音阶内判断。
- 第三方采样不重新授权，必须保留 attribution。

详细规则见：

```text
docs/music-theory.md
```

## 音频方案

当前只保留两个真实采样音色：

- 钢琴
- 吉他

音频文件在：

```text
public/samples/
```

采样来源说明在：

```text
public/samples/ATTRIBUTION.md
```

UI 不直接调用 Tone.js。所有播放都通过：

```text
src/audio/engine.ts
```

切分节奏跟拍使用独立的节拍器点击声接口：

```text
src/audio/metronome.ts
```

切分节奏的简谱谱面布局在：

```text
src/core/jianpu-rhythm.ts
```

它是纯函数层，不引用 React、不访问 DOM。UI 层只消费 layout 并渲染 SVG。

相对音高模唱使用独立的麦克风输入分析接口：

```text
src/audio/input-analyzer.ts
```

## localStorage 数据

当前主要 key：

```text
music-trainer:preferences
music-trainer:stats
music-trainer:single-note-reviews
```

新增偏好字段时必须更新：

```text
src/state/defaults.ts
```

重点是 `DEFAULT_PREFERENCES` 和 `normalizePreferences`，否则旧用户的 localStorage 可能缺字段。

## 统计维度

统计 key 定义在：

```text
src/core/types.ts
```

当前包括：

- `solfege`
- `single-note:1/2/3`
- `melody:2/3/4/5`
- `chord-quality:1/2/3/4`
- `interval-speed:5/10:missing-top/missing-root/missing-interval/mixed`
- `syncopation:${1|2|3|4|5|6|7|8}:${60|80|100}:${'2/4'|'3/4'|'4/4'}:${'full'|'count-in'}`
- `relative-pitch-sing:2/3/4/5/6/7:up/down/mixed`
- `degree-chord`
- `triad-key-match`

重置统计默认只清当前模块当前维度。

## 已踩过的坑

1. GitHub Pages 子路径

   项目部署在 `/notesense-trainer/`，不是 `/`。资源路径必须尊重 Vite `base`。

2. mp3 采样路径

   不能写死 `/samples/...`。音频引擎需要使用 `import.meta.env.BASE_URL`。

3. npm lockfile

   GitHub Actions 使用 `npm ci`，所以 `package-lock.json` 必须和 `package.json` 同步。

4. GitHub Actions Node 版本

   已升级到支持 Node 24 的 action major 版本。

5. PWA 缓存

   用户可能看到旧版本。验收时可以提示强制刷新。

6. 倒计时重复计分

   速算切换模块、切换模式、下一题时必须清理旧 timer，并用锁避免重复计分。

## 后续适合优化的方向

- 把 `src/app/App.tsx` 拆成多个模块组件，降低单文件复杂度。
- 为新增理论模块补更多边界测试。
- 加更细的难度设置，例如是否允许更复杂拼写。
- 改善移动端模块导航。
- 增加更多真实采样或更好的音频加载状态。
- 增加“吉他实弹和弦验证”训练：通过麦克风判断用户是否弹对目标和弦。当前仅有设计草案，见 `docs/future-guitar-chord-verification.md`。
- 增加 docs 的英文版本。
- 如果用户需要跨设备同步，再考虑后端或云存储。

## 接手建议

如果接下来要改功能，建议流程：

1. 先读 `AGENTS.md`。
2. 再读和需求相关的 docs。
3. 用 `rg` 搜现有实现。
4. 先改 `core/` 或 `modules/`，再接 UI。
5. 补 Vitest。
6. UI 变动补 Playwright。
7. 跑测试和构建。
8. 更新文档。
