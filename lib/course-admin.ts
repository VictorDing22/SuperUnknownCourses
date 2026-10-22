/**
 * 课程中心 · 教师端管理接口。
 * 只有教师能上传课程包（后端会再校验角色），学生调用会拿到 403。
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

export interface ManagedCourse {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  cover?: string;
  totalScenes?: number;
  stats?: { slides?: number; interactive?: number; quizzes?: number };
}

export async function fetchManagedCourses(token: string): Promise<ManagedCourse[]> {
  const response = await fetch(`${API_BASE}/course/catalog`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-cache',
  });
  if (!response.ok) throw new Error(`课程目录加载失败（HTTP ${response.status}）`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('课程目录格式不正确');
  return payload as ManagedCourse[];
}

export interface UploadResult {
  version: number;
  sizeBytes: number;
  fileName: string;
  checksum: string;
}

/** 上传课程包，带进度回调 */
export function uploadCoursePackage(
  slug: string,
  file: File,
  token: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('file', file);

    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE}/course/${slug}/package`);
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => reject(new Error('上传失败，请检查网络后重试'));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText) as UploadResult);
        } catch {
          reject(new Error('上传响应格式不正确'));
        }
        return;
      }
      let message = `上传失败（HTTP ${request.status}）`;
      try {
        const problem = JSON.parse(request.responseText) as { detail?: string; title?: string };
        message = problem.detail || problem.title || message;
      } catch {
        /* 保留默认提示 */
      }
      reject(new Error(message));
    };
    request.send(body);
  });
}
