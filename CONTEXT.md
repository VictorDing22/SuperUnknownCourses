# SuperUnknown 课程广场 · 项目上下文

> 这是从 `SuperUnknownMAIC` 工作区同步过来的上下文，供新工作区/新会话继续开发使用。
> 最后更新：2026-10-22

## 1. 项目是什么

- 项目路径：`/Users/dingsaier/Desktop/superunknown-courses`
- 定位：西安欧亚学院 SuperUnknown 工作室的**课程展示 + 播放平台**
- 当前阶段：本地 MVP 已跑通；**部署目标 = Vercel 独立项目 + 子域名 `courses.tavis.com.cn`**（子域名方案见 `DEPLOY.md`），不做用户管理
- 课程来源：SuperUnknownMAIC v1.2.x 导出的**离线单文件 HTML**
- 关键原则：**不重写播放器**，新平台只做「课程广场 → 课程详情 → 全屏播放」的外壳

## 2. 当前状态

本地 dev server 已启动：

```bash
cd ~/Desktop/superunknown-courses
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
pnpm dev
```

访问：

- 首页：http://localhost:3000
- 课程详情：http://localhost:3000/courses/zoujin-chaoweizhi/
- 播放：http://localhost:3000/courses/zoujin-chaoweizhi/learn/
- 深链示例：http://localhost:3000/courses/zoujin-chaoweizhi/learn/#scene-8

构建与预览：

```bash
pnpm build     # 静态导出到 out/
pnpm preview   # http://localhost:4000
pnpm typecheck
```

当前状态：`pnpm build` 已通过；`out/` 是完整静态站点。

## 3. 技术栈

- Next.js 16.1.2（App Router，`output: 'export'` 静态导出）
- React 19.2.3 + TypeScript
- Tailwind CSS v4
- next-themes（深色模式）
- lucide-react（图标）
- @fontsource-variable/inter（Inter Variable 字体）
- playwright-core（只用于 `scripts/capture-covers.mjs` 截图，不参与运行时）

Node 要求：>= 22.19。macOS 默认 `node` 是 20，运行前必须：

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
```

## 4. 视觉与设计决策

风格参考 `SuperUnknownMAIC`：

- 主色：`#2bada1`，深色模式 `#3ecabd`
- 字体：Inter Variable；中文回退 PingFang / 微软雅黑
- 背景：浅蓝灰 `#f4f7fb`，深色 `#0b1220`
- 卡片：大圆角、轻阴影、hover 上浮/封面轻微放大
- 顶部导航：左侧**胶囊式品牌条**（形式参考 SuperUnknownMAIC）：E^u 校徽 + 西安欧亚学院 + `XI'AN EURASIA UNIVERSITY` + 竖分隔线 + 青色「课程广场」；胶囊即首页入口
- 顶部导航右侧：工作室平台 ↗（→ https://www.tavis.com.cn）/ 主题切换（原「课程」链接已去掉，避免与品牌条的「课程广场」重复）
- 页脚：E^u + `SuperUnknown · 超未知`（工作室身份放在下面）；右侧为「西安欧亚学院 · 基于 SuperUnknownMAIC 构建」+ 工作室平台 + 课程广场
- 首页 Hero：顶部一行**工作室字标** `E^u SuperUnknown · 超未知软件工作室`（宽字距、深色词 + 灰色中文），下面是页面标题「课程广场」+ 一句副标题 + 「共 N 门课程」胶囊；原来的「西安欧亚学院 · 和而不同」胶囊已去掉（学校身份交给顶栏品牌条）
- 首页：轻量 Hero + 课程网格（**不做大卡**）
- 课程卡：16:9 真实截图、标题、副标题、幻灯片/互动/测验统计
- 详情页：大封面 + 简介 + 标签 + 统计 + 开始学习 + 11 个章节
- 播放页：全屏 iframe，无平台顶栏；课程播放器自带的 header/footer 保留
- 播放页顶部中间有一个半透明「返回课程」胶囊
- 移动端：品牌条收成「校徽 + 西安欧亚学院」，英文校名与「课程广场」在窄屏隐藏（<360px 全部隐藏），占位卡隐藏，课程卡单列

## 5. 页面与路由

```
/                                     课程广场
/courses/[slug]/                      课程详情
/courses/[slug]/learn/                全屏播放（iframe）
```

路由分组：

- `app/(site)/`：带 Header/Footer 的展示页
- `app/(player)/`：无 Header/Footer 的播放页
- `app/layout.tsx`：html/body + ThemeProvider
- `app/not-found.tsx`：品牌化 404

## 6. 文件地图

```
app/
  (site)/
    layout.tsx                  Header + main + Footer
    page.tsx                    课程广场
    courses/[slug]/page.tsx     课程详情
  (player)/
    layout.tsx                  空布局
    courses/[slug]/learn/page.tsx  播放页
  globals.css                   设计 tokens / 动画 / 深色模式
  layout.tsx                    根布局 + metadata
  not-found.tsx
  icon.svg
components/
  site-header.tsx
  site-footer.tsx
  course-card.tsx
  coming-soon-card.tsx
  chapter-card.tsx
  player-shell.tsx              iframe + 加载遮罩 + 返回课程
  eurasia-mark.tsx              E^u 校徽 SVG
  theme-provider.tsx
  theme-toggle.tsx
lib/
  courses.ts                    课程类型与查询
  utils.ts                      cn()
content/courses/
  zoujin-chaoweizhi.json        课程元数据 + 11 个章节
public/courses/zoujin-chaoweizhi/
  classroom.html                7.8MB SuperUnknownMAIC 离线课程
  cover.jpg                     课程封面（scene 3 · 关卡1 改名）
  scene-1.jpg ~ scene-11.jpg    章节缩略图
scripts/
  capture-covers.mjs            Playwright 截封面/缩略图
  rebrand-player.mjs            把导出播放器里的 OpenMAIC 标识改成 SuperUnknownMAIC
docs/
  home.png / detail.png / learn.png  截图
```

## 7. 课程数据

`content/courses/zoujin-chaoweizhi.json`：

- 标题：走进超未知软件工作室
- 副标题：工作室入门 · 网页改造实战
- 11 个场景：4 张幻灯片 + 5 个互动关卡 + 2 个测验
- 封面：`/courses/zoujin-chaoweizhi/cover.jpg`（取自 scene 3「关卡 1 · 改名」的画面，已去掉播放器字幕条并裁成 16:9）
- 播放器：`/courses/zoujin-chaoweizhi/classroom.html`
- 章节链接：`/courses/zoujin-chaoweizhi/learn/#scene-<order>`

`lib/courses.ts` 目前只导入这一门课。新增课程时：

1. 把 SuperUnknownMAIC 导出的 HTML 放到 `public/courses/<slug>/classroom.html`
2. 生成封面/缩略图：

```bash
node scripts/capture-covers.mjs --slug <slug> --cover 10
```

3. 复制 `content/courses/zoujin-chaoweizhi.json` 改成新课程
4. 在 `lib/courses.ts` 里 import 并加入数组

## 8. 播放器实现细节

- `classroom.html` 是 SuperUnknownMAIC（v1.2.x 导出格式）的离线导出：
  - 单文件、内嵌 45 段媒体、`connect-src 'none'`
  - 自带开始遮罩、上一页/下一页、播放/暂停、字幕、全屏、场景侧栏
  - 支持 `#scene-N`（1-based）深链
- 导出器写入的 `openmaic-*` 元素 id / CSS 类 / `__OPENMAIC*__` 全局已统一改名为 `superunknownmaic-*` / `__SUPERUNKNOWNMAIC*__`（`scripts/rebrand-player.mjs`）；**重新导出新课程后要再跑一次**，否则 HTML 里又会带回 OpenMAIC 标识
- 播放页用 iframe 加载，`allow="autoplay; fullscreen; clipboard-write"`
- `PlayerShell` 在客户端挂载后才设置 iframe src，避免 hash 导致二次加载
- `#scene-N` 从 `window.location.hash` 读取；章节卡片直接链接到带 hash 的播放页
- 播放器内部会 `history.replaceState` 更新自己的 hash，父页面不跟踪进度

### 已知限制

- 手机竖屏时 16:9 课程会上下留白（播放器自身布局），横屏体验最好
- iframe 内是 SuperUnknownMAIC 播放器 UI，不能直接用平台视觉覆盖
- 没有学习进度/账号/统计（按需求暂时不做）
- `classroom.html` 里的 `classroomUrl` 仍指向 `open.maic.chat`；本课程没有 PBL/讨论场景，暂未使用
- 课程更新需要重新导出 HTML 并重新生成截图

## 9. 与 SuperUnknownMAIC / 工作室平台的关系

### SuperUnknownMAIC

- 路径：`/Users/dingsaier/Desktop/SuperUnknownMAIC`
- 基于上游 OpenMAIC 的欧亚本地化定制（v1.0.0 分支）
- 用于生成课程、导出离线 HTML
- 不是这个展示平台的依赖；新平台只消费导出的 HTML

### 工作室平台

- 站内入口：顶部导航「工作室平台 ↗」和页脚链接，均指向 https://www.tavis.com.cn
- 旧地址：http://101.42.182.117/teacher/topics（已废弃，不要再用于外链）
- 技术：Vite + React SPA，后端 `/api`
- 功能：课题、小组、过程资料、提交、批改、成果展示
- **没有课程/播放器模块**
- 「课题资源」只支持 Word/PPT/Excel/PDF/ZIP/图片，≤10MB，只能下载
- 「课题简介」是纯文本，不会渲染可点击链接
- 因此工作室平台不能靠后台配置直接打开课程；需要加课程链接字段/iframe，或先用外链

### 版本背景：上游 OpenMAIC

- 上游 v1.2.0（2026-10-16）新增「离线 HTML 课程」导出，SuperUnknownMAIC 沿用该导出格式
- v1.2.0 需要 PostgreSQL + 常驻 Node 服务；Vercel 停留在 1.1.x
- 当前 `classroom.html` 就是 SuperUnknownMAIC v1.2.x 格式的离线导出
- 官方托管站：https://open.maic.chat
- 清华 MAIC 平台：https://www.maic.tsinghua.edu.cn（独立产品，课程不互通）

## 10. 历史决策（从上一个工作区同步）

1. 一开始只是把 SuperUnknownMAIC 跑起来（Node 22 + `pnpm dev`）。
2. 讨论「生成的课程导出给同学看，是否要重写网课平台」：
   - 结论：不需要重写；SuperUnknownMAIC 本身有播放器，v1.2.x 还能导出离线 HTML。
3. 分析工作室平台能否直接打开课程：
   - 结论：平台没有课程模块，只能加链接/iframe 或外链绕过。
4. 用户决定新建一个纯展示平台，前端风格接近 SuperUnknownMAIC，不做用户管理。
5. 用户提供参考图：顶部两张大卡 + 下面 4 列课程卡；后来明确「不需要大卡，本地先跑通」。
6. 于是实现当前版本：
   - 首页只做课程网格（1 门课 + 「更多课程制作中」占位，手机隐藏占位）
   - 课程详情 + 章节深链
   - 全屏 iframe 播放
   - 用 Playwright 从 `classroom.html#scene-N` 截取真实封面/章节图
   - 本地 `pnpm build` 通过

## 11. 下一步可选方向

- 视觉微调（封面比例、卡片密度、Hero 文案）
- 增加更多课程（复制 HTML + JSON + 截图）
- 手机竖屏加「建议横屏」提示
- 学习进度（轮询 iframe 的 `#scene-N` + localStorage）
- 工作室平台加「课程链接」字段或 iframe 入口
- 部署（已选方案 A：Vercel 独立项目 + `courses.tavis.com.cn` 子域名；详见 `DEPLOY.md`，尚未实际上线）
- 课程搜索/标签筛选
- 课程封面从「截图」升级为「截图 + 标题合成」

## 12. 快速自检清单

- [ ] `pnpm dev` 后首页 200
- [ ] 课程卡可点击进入详情
- [ ] 详情页「开始学习」进入播放页
- [ ] iframe 加载 `classroom.html`，出现「播放课堂」
- [ ] 章节卡片跳到 `#scene-N`
- [ ] 手机无横向滚动
- [ ] 深色模式切换正常
- [ ] `pnpm build` 通过，`out/courses/.../classroom.html` 存在
