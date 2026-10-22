# 部署到 Vercel（子域名 courses.tavis.com.cn）

本站是 `output: 'export'` 的纯静态站，部署 = 把 `out/` 目录传到 Vercel 的静态托管上，没有 Node 服务、没有数据库、没有环境依赖。

主站 `www.tavis.com.cn` 已经跑着工作室门户（Vercel 上的 Next.js 动态应用），所以**课程站单独开一个项目 + 子域名**，两边互不影响。

## 一、Vercel 项目（一次性）

1. 打开 https://vercel.com/new ，Import Git Repository，选 `VictorDing22/SuperUnknownCourses`。
2. 构建设置：

   | 项 | 值 |
   |---|---|
   | Framework Preset | `Next.js`（自动识别） |
   | Root Directory | 留空（仓库根就是项目根） |
   | Build Command | 自动 `pnpm build`（可留空） |
   | Output Directory | 留空，Next.js preset 会自动用 `out/` |
   | Install Command | 自动 `pnpm install` |

3. Environment Variables 加一条：

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://courses.tavis.com.cn` |

   不设这个，分享卡的 `og:image` 会写成 `http://localhost:3000/...`（见 `app/layout.tsx` 的 `metadataBase`）。

4. Deploy。首次部署约 1–2 分钟。

## 二、绑定域名

1. 项目 → Settings → Domains → Add，填 `courses.tavis.com.cn`。
2. Vercel 会给出需要配置的 DNS 记录，形如：

   | 主机记录 | 类型 | 记录值 | TTL |
   |---|---|---|---|
   | `courses` | `CNAME` | `cname.vercel-dns.com` | 600 |

   **以 Vercel 页面显示的值为准**，不要在值里带 `https://` 或结尾的点。

3. 去域名 DNS 服务商加这条记录：
   - **阿里云 DNS**：云解析 → 域名 → 解析设置 → 添加记录，主机记录填 `courses`（不要填 `@`）。
   - **腾讯云 DNSPod**：我的域名 → 解析 → 添加记录，主机记录 `courses`。
   - **Cloudflare**：DNS → Add record，Type `CNAME`，Name `courses`，Proxy 先关掉（灰云），证书签发后再决定是否开启。

4. 回到 Vercel 点 Verify。生效后 Vercel 自动签发 Let's Encrypt 证书（通常几分钟，DNS 慢的话最长 24h）。

## 三、上线验收

```bash
dig +short courses.tavis.com.cn          # 应能看到 Vercel 的 CNAME/地址
curl -I https://courses.tavis.com.cn/    # 200 + server: Vercel
```

页面自检：

- [ ] 首页 https://courses.tavis.com.cn/ 200，课程卡有图
- [ ] 详情页 https://courses.tavis.com.cn/courses/zoujin-chaoweizhi/ 200
- [ ] 播放页 https://courses.tavis.com.cn/courses/zoujin-chaoweizhi/learn/ 能点「播放课堂」
- [ ] 深链 https://courses.tavis.com.cn/courses/zoujin-chaoweizhi/learn/#scene-8 停在第 8 幕
- [ ] 分享到微信/飞书，卡片标题图和描述正常（说明 `NEXT_PUBLIC_SITE_URL` 生效）
- [ ] 顶部「工作室平台 ↗」仍指向 https://www.tavis.com.cn

## 四、日常更新

`git push origin main` 后 Vercel 自动重新构建发布。课程更新流程：

1. 替换 `public/courses/<slug>/classroom.html`
2. `pnpm rebrand:player <slug>`（导出器会写回 OpenMAIC 标识）
3. 需要的话重生成截图：`node scripts/capture-covers.mjs --slug <slug> --cover <n>`
4. 提交推送

> 注意：`classroom.html` 缓存 1 小时（`vercel.json`）。如果急着让所有人看到新版本，在 Vercel 项目里重新部署并 Purge 一次缓存，或者把文件名带版本号。

## 五、排错

| 现象 | 原因 / 处理 |
|---|---|
| 构建失败，提示 Node 版本不合法 | `package.json` 的 `engines.node` 必须是 `22.x`（Vercel 不接受 `>=22.19.0`）——已修 |
| 部署成功但页面 404 | 确认 Output Directory 没被手动改成 `.next`；本项目是静态导出，产物在 `out/` |
| 子域名一直 Pending / 证书不签发 | CNAME 没生效或填错（带了 `https://`、结尾点、或填成了 `www`）；`dig` 查一下 |
| 打开课程很慢 | `classroom.html` 8.1 MB，压缩后约 5.2 MB（音频 base64 内嵌，压不动）；首次加载慢是正常的 |
| 图片 404 | 课程 JSON 里的路径是根绝对路径（`/courses/<slug>/cover.jpg`），所以不能部署到子路径，只能挂子域名 |
