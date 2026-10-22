/**
 * 站点级配置。
 *
 * `software` 分支部署在学院服务器的 `/plaza/` 下，构建时通过
 * NEXT_PUBLIC_BASE_PATH=/plaza 注入；`main` 分支不设这个变量，行为和以前一致。
 */

/** 部署前缀，例如 "/plaza"；为空表示挂在站点根路径 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** 是否为校园部署（挂在子路径下、需要登录） */
export const IS_CAMPUS = BASE_PATH !== '';

/**
 * 顶栏「跨界探索平台」链接目标。
 * 默认指回同源的跨界探索平台（课程中心与它共用账号，来回切换很自然）；
 * 想指到对外官网时把 NEXT_PUBLIC_PORTAL_URL 设成 https://www.tavis.com.cn。
 */
export const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? '/';

/** 该链接的显示名 */
export const PORTAL_LABEL = process.env.NEXT_PUBLIC_PORTAL_LABEL ?? '跨界探索平台';

/**
 * 给以 `/` 开头的站内资源路径加上部署前缀。
 * - 外部链接（http://、//cdn…）和已经是前缀开头的路径原样返回
 * - 幂等：重复调用不会变成 /plaza/plaza/...
 *
 * 注意：next/link 的 href 会自动加 basePath，**只有图片、iframe 这类
 * 字符串地址需要手动过一遍这个函数**。
 */
export function withBasePath(path: string): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return path;
  if (!BASE_PATH) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}
