# AGENTS.md

本工作区是 **SuperUnknown 课程广场**：一个纯静态的课程展示 + 播放平台。

**开始任何工作前，先读 `CONTEXT.md`。** 里面有项目定位、技术栈、文件地图、课程数据、播放器实现、历史决策和下一步方向。

快速启动：

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
pnpm dev
```

- 首页：http://localhost:3000
- 课程详情：http://localhost:3000/courses/zoujin-chaoweizhi/
- 播放页：http://localhost:3000/courses/zoujin-chaoweizhi/learn/

注意：

- 课程播放器是 SuperUnknownMAIC 导出的 `public/courses/zoujin-chaoweizhi/classroom.html`，**不要重写播放器**，平台只做外壳。
- 没有用户管理、没有数据库、没有部署；按当前需求保持纯静态。
- 课程 HTML 是 7.8MB，新增课程时不要把它内联进 React bundle，继续放 `public/` 用 iframe。
