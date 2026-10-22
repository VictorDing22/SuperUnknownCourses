/**
 * 学习数据：断点续播 + 观看心跳。
 *
 * 课程内容本身在课程站（静态 HTML），进度和时长由跨界平台后端记录：
 *   GET  /api/course/{slug}/progress
 *   PUT  /api/course/{slug}/progress
 *   POST /api/course/{slug}/heartbeat
 *
 * 所有请求都带当前的 Bearer token；401 时静默降级（不打断学习）。
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

export interface CourseProgress {
  lastScene: number;
  scenesSeen: number;
  totalScenes: number;
  updatedAt: string | null;
}

export interface HeartbeatResult {
  sessionId: number;
  completed: boolean;
}

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function fetchProgress(slug: string, token: string): Promise<CourseProgress | null> {
  return call<CourseProgress>(`/course/${slug}/progress`, token);
}

export function saveProgress(
  slug: string,
  token: string,
  lastScene: number,
  scenesSeen: number,
): Promise<CourseProgress | null> {
  return call<CourseProgress>(`/course/${slug}/progress`, token, {
    method: 'PUT',
    body: JSON.stringify({ lastScene, scenesSeen }),
  });
}

export interface HeartbeatInput {
  sessionId: number | null;
  durationMs: number;
  lastScene: number;
  scenesSeen: number;
  ended: boolean;
}

export function sendHeartbeat(
  slug: string,
  token: string,
  input: HeartbeatInput,
): Promise<HeartbeatResult | null> {
  return call<HeartbeatResult>(`/course/${slug}/heartbeat`, token, {
    method: 'POST',
    body: JSON.stringify(input),
    keepalive: input.ended,
  });
}

export interface PackageLink {
  url: string;
  expiresAt: number;
  version: number;
}

/**
 * 课程包播放地址（签名，10 分钟有效）。
 * 拿不到（没上传过、接口不可用）时返回 null，调用方退回静态文件。
 */
export async function fetchPackageUrl(slug: string, token: string): Promise<PackageLink | null> {
  return call<PackageLink>(`/course/${slug}/package-url`, token);
}

/** 从 iframe 的 hash 里读当前场景序号（同源才读得到） */
export function readSceneFromFrame(frame: HTMLIFrameElement | null): number | null {
  try {
    const hash = frame?.contentWindow?.location.hash ?? '';
    const matched = /scene-(\d+)/.exec(hash);
    return matched ? Number(matched[1]) : null;
  } catch {
    return null;
  }
}
