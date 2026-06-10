# 音乐基础训练器

一个纯前端 PWA 音乐基础训练器，包含看音名选唱名、单音听辨、旋律短句听写、和弦性质听辨、根音冠音音程速算。

## 本地使用

```bash
npm install
npm run dev
```

终端会显示一个本地地址，通常是 `http://127.0.0.1:5173/`。在浏览器打开即可使用。

## 发布到 GitHub Pages

本项目已经内置 GitHub Actions 部署配置。上传到 GitHub 后：

1. 打开 GitHub 仓库页面。
2. 进入 `Settings`。
3. 左侧进入 `Pages`。
4. 在 `Build and deployment` 里，把 `Source` 选择为 `GitHub Actions`。
5. 回到仓库首页，进入 `Actions`，等待 `Deploy Pages` 工作流完成。

发布完成后，GitHub 会显示一个公开网址，格式通常是：

```text
https://你的用户名.github.io/仓库名/
```

## 更新网页

以后每次修改代码后，只需要提交并推送到 `main` 分支：

```bash
git add .
git commit -m "Update trainer"
git push
```

GitHub Actions 会自动重新构建并发布网页。

## 常用命令

```bash
npm test
npm run build
npm run test:e2e
```
