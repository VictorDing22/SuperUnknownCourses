/**
 * 课程中心的身份层。
 *
 * 账号体系复用跨界探索平台（同一张 users 表、同一组 /api/auth/* 接口），
 * 登录态写在同源的 sessionStorage['cross-studio-auth-v1']，形状与平台前端一致，
 * 所以在门户登录过的用户进课程中心不用再登，反之亦然。
 *
 * 这里只做「登录 / 注册 / 读会话 / 清除」，不做权限决策。
 * 真正的权限校验必须在后端接口层，前端这道门只是体验。
 */
import { BASE_PATH } from '@/lib/site';

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

/** 后端接口前缀，默认同源 /api；本地单独跑课程站时可用环境变量指向 8080 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

const ROLE_LABEL: Record<AuthRole, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

export function roleLabel(role: AuthRole): string {
  return ROLE_LABEL[role] ?? role;
}

/* ── 会话读写 ───────────────────────────────────────────── */

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
      user: { id: user.id, username: user.username, label: user.label, role: user.role },
      accessToken: value.accessToken,
      expiresAt: value.expiresAt,
    };
  } catch {
    return null;
  }
}

function writeAuthSession(session: AuthSession): void {
  try {
    window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ source: 'api', ...session }));
  } catch {
    /* 隐私模式下存储不可用时，本次会话仍然有效（只存在内存里则由页面负责） */
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/* ── 登录页地址 ─────────────────────────────────────────── */

/** 课程中心自己的登录页（带部署前缀） */
export const LOGIN_PATH = `${BASE_PATH}/login/`;

export function loginHref(returnTo?: string): string {
  const base = process.env.NEXT_PUBLIC_LOGIN_URL ?? LOGIN_PATH;
  if (!returnTo) return base;
  return `${base}?next=${encodeURIComponent(returnTo)}`;
}

/* ── 接口调用 ───────────────────────────────────────────── */

export class AuthApiError extends Error {
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'AuthApiError';
    this.fieldErrors = fieldErrors;
  }
}

interface ApiProblem {
  title?: string;
  detail?: string;
  fieldErrors?: Record<string, string>;
}

interface ApiUser {
  id: string;
  account: string;
  displayName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: ApiUser;
}

const API_ROLE: Record<ApiUser['role'], AuthRole> = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new AuthApiError('无法连接服务器，请检查网络后重试');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const problem = (payload ?? {}) as ApiProblem;
    throw new AuthApiError(
      problem.detail || problem.title || `请求失败（HTTP ${response.status}）`,
      problem.fieldErrors,
    );
  }

  return payload as T;
}

/** 账号密码登录，成功后写入会话并返回 */
export async function signIn(identifier: string, password: string): Promise<AuthSession> {
  const data = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });

  if (!data || typeof data.accessToken !== 'string' || !data.accessToken || !data.user) {
    throw new AuthApiError('登录响应格式异常');
  }

  const role = API_ROLE[data.user.role];
  if (!role) throw new AuthApiError('账号角色无法识别');

  const session: AuthSession = {
    user: {
      id: String(data.user.id),
      username: data.user.account,
      label: data.user.displayName,
      role,
    },
    accessToken: data.accessToken,
    expiresAt: Date.now() + (Number(data.expiresIn) || 7200) * 1000,
  };

  writeAuthSession(session);
  return session;
}

export interface StudentSignUpInput {
  displayName: string;
  studentNo: string;
  phone: string;
  classId: string;
  password: string;
  confirmPassword: string;
}

/** 学生自助注册（14 位学号 + 班级） */
export async function signUpStudent(input: StudentSignUpInput): Promise<void> {
  await requestJson('/auth/register/student', {
    method: 'POST',
    body: JSON.stringify({ ...input, classId: Number(input.classId) }),
  });
}

export interface TeacherSignUpInput {
  displayName: string;
  employeeNo: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

/** 校内教师自助注册（8 位工号） */
export async function signUpTeacher(input: TeacherSignUpInput): Promise<void> {
  await requestJson('/auth/register/teacher', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface PublicClass {
  id: number;
  name: string;
  majorId: number;
  majorName: string;
  gradeId: number;
  grade: number;
}

/** 注册页的班级下拉数据（公开接口，无需登录） */
export async function fetchPublicClasses(signal?: AbortSignal): Promise<PublicClass[]> {
  const data = await requestJson<PublicClass[]>('/public/classes', { signal });
  return Array.isArray(data) ? data : [];
}

/** 记住上次登录的账号（与门户共用同一个 localStorage key） */
export function rememberAccount(account: string, remember: boolean): void {
  try {
    if (remember) window.localStorage.setItem('remembered-user', account);
    else window.localStorage.removeItem('remembered-user');
  } catch {
    /* ignore */
  }
}

export function readRememberedAccount(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem('remembered-user') ?? '';
  } catch {
    return '';
  }
}
