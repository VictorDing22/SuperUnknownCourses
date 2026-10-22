# SuperUnknown 课程广场

西安欧亚学院 SuperUnknown 工作室课程展示站。纯静态、无登录、无数据库，课程来自 SuperUnknownMAIC 导出的单文件 HTML。

## 本地运行

项目要求 Node.js >= 22.19。macOS 上如果默认 `node` 是 20，先切换：

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
```

安装依赖并启动：

```bash
pnpm install
pnpm dev
```

打开 http://localhost:3000

## 目录

- `app/(site)/` — 课程广场、课程详情
- `app/(player)/` — 全屏播放页
- `content/courses/<slug>.json` — 课程元数据与章节
- `public/courses/<slug>/classroom.html` — SuperUnknownMAIC 导出的课程播放器
- `public/courses/<slug>/cover.jpg`、`scene-*.jpg` — 课程封面与章节缩略图

## 新增课程

1. 把 SuperUnknownMAIC 导出的 HTML 放到 `public/courses/<slug>/classroom.html`
2. 生成封面和章节缩略图：

```bash
node scripts/capture-covers.mjs --slug <slug> --cover 10
```

3. 参考 `content/courses/zoujin-chaoweizhi.json` 写一份课程 JSON
4. 在 `lib/courses.ts` 里导入新课程

## 构建

```bash
pnpm build
pnpm preview
```

静态产物在 `out/`，`pnpm preview` 会在 http://localhost:4000 预览。

## 部署

上线到 Vercel，域名 `courses.tavis.com.cn`。完整步骤（项目设置、域名、DNS、验收清单、排错）见 [DEPLOY.md](DEPLOY.md)。
