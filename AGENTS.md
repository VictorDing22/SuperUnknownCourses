# AGENTS.md

本工作区是 **SuperUnknown 课程广场**：一个纯静态的课程展示 + 播放平台。

**开始任何工作前，先读 `CONTEXT.md`。** 里面有项目定位、技术栈、文件地图、课程数据、播放器实现、历史决策和下一步方向。

快速启动：

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
pnpm dev
```

- 课程广场：http://localhost:3000/plaza/
- 课程详情 + 播放：http://localhost:3000/plaza/courses/view/?slug=zoujin-chaoweizhi
- 我的课程 / 课程管理：/plaza/my/ 、/plaza/manage/（后者仅教师）

注意：

- 课程播放器是 SuperUnknownMAIC 导出的 `public/courses/zoujin-chaoweizhi/classroom.html`，**不要重写播放器**，平台只做外壳。
- **本分支是 `software`**（校园版）：部署在学院服务器 `http://101.42.182.117/plaza/`，挂载子路径、需要跨界平台的登录态。见 `DEPLOY-CAMPUS.md`。
- `main` 是对外的公开版（https://courses.tavis.com.cn，Vercel 自动发布，见 `DEPLOY.md`），**本分支不要往 Vercel 部署**。
- 没有用户管理、没有数据库；身份与进度由跨界探索平台的 Spring 后端提供，课程站不存用户。
- 课程 HTML 是 7.8MB，新增课程时不要把它内联进 React bundle，继续放 `public/` 用 iframe。
