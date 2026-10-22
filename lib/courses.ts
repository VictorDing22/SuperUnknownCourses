import zoujinChaoweizhi from '@/content/courses/zoujin-chaoweizhi.json';
import { withBasePath } from '@/lib/site';

export interface CourseStats {
  scenes: number;
  slides: number;
  interactive: number;
  quizzes: number;
}

/** 构建时的课程元数据：只用于广场在接口不可用时的兜底展示 */
export interface Course {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  level: string;
  duration: string;
  author: string;
  updatedAt: string;
  cover: string;
  htmlPath: string;
  featured?: boolean;
  stats: CourseStats;
}

/**
 * 课程 JSON 里的封面是根绝对路径（如 `/courses/<slug>/cover.jpg`）。
 * 部署到子路径时静态资源不会自动加 basePath，所以在这里统一补一次。
 */
function withAssetPrefix(course: Course): Course {
  return { ...course, cover: withBasePath(course.cover), htmlPath: withBasePath(course.htmlPath) };
}

const courses: Course[] = [withAssetPrefix(zoujinChaoweizhi as unknown as Course)];

export function getAllCourses(): Course[] {
  return courses;
}

/** 仓库里自带的课程包（接口没有版本时兜底用） */
export function getBundledPlayer(slug: string): string | null {
  return courses.find((course) => course.slug === slug)?.htmlPath ?? null;
}
