/**
 * 复用跨界探索平台的登录态。
 *
 * 平台把登录信息写在 sessionStorage 的同源存储里（键名 cross-studio-auth-v1），
 * 课程站挂在同一域名的 /plaza/ 子路径下，属于同一个源，所以能直接读到。
 *
 * 这里只做「读 / 判断是否有效 / 清除」，不做权限决策。
 * 真正的权限校验必须在后端接口层，前端这道门只是体验。
 */

export const AUTH_SESSION_KEY = 'cross-studio-auth-v1';

export type AuthRole = 'student' | 'teacher' | 'admin';

export interface AuthUser {
  id: string;
  username: string;
  label: string;
  role: AuthRole;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
}

const VALID_ROLES: AuthRole[] = ['student', 'teacher', 'admin'];

/**
 * 读取并校验当前会话。无效（未登录、已过期、结构不对）时返回 null。
 * 校验规则与跨界平台前端 `stores/auth-session.ts` 保持一致。
 */
export function readAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as {
      source?: string;
      accessToken?: unknown;
      expiresAt?: unknown;
      user?: Partial<AuthUser>;
    };

    if (!value || value.source !== 'api') return null;

    const user = value.user;
    if (
      !user ||
      typeof user.id !== 'string' ||
      typeof user.username !== 'string' ||
      typeof user.label !== 'string' ||
      !user.role ||
      !VALID_ROLES.includes(user.role)
    ) {
      return null;
    }

    if (typeof value.accessToken !== 'string' || !value.accessToken) return null;
    if (typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt)) return null;
    if (value.expiresAt <= Date.now()) return null;

    return {
      user: {
        id: user.id,
        username: user.username,
        label: user.label,
        role: user.role,
      },
      accessToken: value.accessToken,
      expiresAt: value.expiresAt,
    };
  } catch {
    return null;
  }
}

/** 退出登录：清掉本平台的会话，跳回登录页 */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    /* 隐私模式下存储不可用时忽略，跳转仍然生效 */
  }
}

/** 门户登录页地址，可带一个登录后回跳的地址 */
export function loginHref(returnTo?: string): string {
  const base = process.env.NEXT_PUBLIC_LOGIN_URL ?? '/login';
  if (!returnTo) return base;
  return `${base}?redirect=${encodeURIComponent(returnTo)}`;
}

const ROLE_LABEL: Record<AuthRole, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

export function roleLabel(role: AuthRole): string {
  return ROLE_LABEL[role] ?? role;
}
