# 部署到学院服务器（`/plaza/`）

> **状态：前端已完成（A2/A3/A4）** —— 还差学习进度（A5）和 nginx 落地（A6）。
>
> | 项 | 值 |
> |---|---|
> | 服务器 | `101.42.182.117`（腾讯云，Ubuntu + nginx 1.28.3） |
> | 挂载点 | `http://101.42.182.117/plaza/` |
> | 形态 | **纯静态**（`output: 'export'`），不跑 Node，不建新库 |
> | 身份 | 复用跨界探索平台的 JWT（`sessionStorage['cross-studio-auth-v1']`） |
> | 数据 | 学习进度存跨界系统的现有数据库（接口待开发） |

这个分支和 `main` 的关键区别只有两处：**挂载在子路径 `/plaza/`**、**需要登录态**。播放器和课程内容完全一致。

Vercel 的部署方式见 `DEPLOY.md`（那是 `main` 的流程，本分支不用）。

## 一、构建

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
pnpm install
pnpm build:campus
```

实际等价于：

```bash
NEXT_PUBLIC_BASE_PATH=/plaza \
NEXT_PUBLIC_SITE_URL=http://101.42.182.117 \
next build
```

| 环境变量 | 作用 | 默认 |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | 挂载前缀，校园版 `/plaza` | 空（根路径，即 main） |
| `NEXT_PUBLIC_SITE_URL` | og:image 等绝对地址 | `http://localhost:3000` |
| `NEXT_PUBLIC_PORTAL_URL` | 顶栏/页脚入口链接指向 | `/`（同源跨界探索平台）；设成官网地址则跳外部 |
| `NEXT_PUBLIC_PORTAL_LABEL` | 该入口的显示名 | `跨界探索平台` |
| `NEXT_PUBLIC_LOGIN_URL` | 登录页地址（一般不用改） | `${BASE_PATH}/login/` |
| `NEXT_PUBLIC_API_BASE_URL` | 后端接口前缀 | `/api`（同源） |

产物仍在 `out/`，但内部资源路径会带 `/plaza` 前缀（如 `/plaza/_next/static/...`）。

本地预览（模拟服务器挂载点）：

```bash
pnpm preview:campus    # → http://localhost:4000/plaza/
```

> 不要用 `pnpm preview`，它把 `out/` 挂在根目录，`/plaza/...` 的请求会全部 404。

## 二、nginx 配置

`/plaza/` 是**静态目录**，不要写成 `proxy_pass`——本方案没有 Node 进程。

```nginx
# 必须写在 SPA 的 try_files 兜底之前
location /plaza/ {
    alias /var/www/plaza/;
    index index.html;
    try_files $uri $uri/ /plaza/index.html;

    # 带 hash 的构建产物，长缓存
    location /plaza/_next/static/ {
        alias /var/www/plaza/_next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 播放器：8MB，缓存 1 小时
    location ~ ^/plaza/(courses/.+/classroom\.html)$ {
        alias /var/www/plaza/$1;
        expires 1h;
    }

    # 图片
    location ~ ^/plaza/(courses/.+\.(?:jpg|jpeg|png|webp|svg))$ {
        alias /var/www/plaza/$1;
        expires 1d;
    }
}
```

⚠️ 现有的跨界平台前端是 SPA（`try_files ... /index.html`），**未知路径会被它吞掉**。`/plaza/` 的 location 必须放在兜底规则前面，否则课程站永远打不开。

## 三、发布

```bash
# 本地构建后同步（推荐，服务器不需要装 Node）
rsync -avz --delete out/ user@101.42.182.117:/var/www/plaza/
ssh user@101.42.182.117 'sudo nginx -t && sudo nginx -s reload'
```

**发布不需要重启任何进程**，也不影响跨界平台——这是静态方案最大的好处。

回滚：保留上一版目录，用软链切换。

```bash
# 服务器上
/var/www/plaza -> releases/2026-10-22-1430
```

## 四、待办

| 阶段 | 内容 | 状态 |
|---|---|---|
| A2 | basePath + 构建脚本 + 预览脚本 | ✅ 完成 |
| A3 | 课程资源路径加 `/plaza` 前缀（封面/缩略图/播放器） | ✅ 完成 |
| A4 | 登录门禁（读 `cross-studio-auth-v1` + 顶栏用户） | ✅ 完成 |
| A5 | 学习进度（需跨界后端接口） | ⬜ 待做 |
| A6 | nginx 配置落地 + 部署脚本 + 回滚 | ⬜ 待做 |

### 登录门禁的实现边界（重要）

- 门禁是**客户端**的：读取 `sessionStorage['cross-studio-auth-v1']`，校验 `source === 'api'`、角色白名单和 `expiresAt`。
- 未登录时**整页不渲染内容**，只显示「去登录」卡片，跳 `/login?redirect=<当前路径>`。
- 因为内容是客户端渲染的，**静态 HTML 里不含课程内容**——对校内系统无所谓，但如果以后要 SEO 就得重新设计。
- ⚠️ **`/plaza/courses/*/classroom.html` 是静态文件，nginx 会直接返回**，不经过任何鉴权。想真正锁住，需要在 nginx 上加 `auth_request` 转发到后端的 `/api/users/me` 校验。**这是 A6 的事，不要以为前端门禁能挡住直接访问 URL。**

## 四点五、登录页

课程中心有自己的登录页 `/plaza/login/`（不经过 AuthGate），支持四种模式：

| 模式 | 调用的接口 |
|---|---|
| 登录（学号/工号/手机号） | `POST /api/auth/login` |
| 学生注册（14 位学号 + 班级） | `POST /api/auth/register/student` |
| 教师注册（8 位工号） | `POST /api/auth/register/teacher` |
| 忘记密码 | 无（引导联系管理员，二期接短信找回） |

- 班级下拉来自 `GET /api/public/classes`（公开接口）
- 登录成功写 `sessionStorage['cross-studio-auth-v1']`，**与跨界平台共用同一个 key**，所以两边单点登录
- 「记住我」写 `localStorage['remembered-user']`，也和平台共用
- 未登录访问任何课程页 → 跳 `/plaza/login/?next=<原路径>`，登录后自动回去
- 退出登录 → 清会话 → 回登录页

## 五、和跨界平台的边界

```
浏览器（JWT 在 sessionStorage）
   │
   ├── GET /plaza/...        → nginx 直接读磁盘（静态，不经过后端）
   ├── GET /api/course/...   → nginx 反代 → Spring（现成 JWT 校验）
   │
   用户管理、角色、工作室关系：**全部留在跨界系统，课程站不存一份**
```

前端门禁只负责"体验"（没登录就别进去），**真正的权限校验必须在 Spring 接口层**——因为 sessionStorage 是客户端数据，改一下就能绕过。
