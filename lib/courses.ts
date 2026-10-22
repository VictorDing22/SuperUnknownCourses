import zoujinChaoweizhi from '@/content/courses/zoujin-chaoweizhi.json';
import { withBasePath } from '@/lib/site';

export type ChapterType = 'slide' | 'interactive' | 'quiz' | 'pbl';

export interface Chapter {
  order: number;
  type: ChapterType;
  title: string;
  thumb?: string;
}

export interface CourseStats {
  scenes: number;
  slides: number;
  interactive: number;
  quizzes: number;
}

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
  chapters: Chapter[];
}

/**
 * 课程 JSON 里的封面、章节缩略图、播放器地址都是根绝对路径
 * （如 `/courses/<slug>/cover.jpg`）。部署到子路径时，
 * next/img 和 iframe 不会自动加 basePath，所以在这里统一补一次。
 *
 * 只处理资源地址；页面跳转走 next/link，Next 会自动加前缀。
 */
function withAssetPrefix(course: Course): Course {
  return {
    ...course,
    cover: withBasePath(course.cover),
    htmlPath: withBasePath(course.htmlPath),
    chapters: course.chapters.map((chapter) => ({
      ...chapter,
      thumb: chapter.thumb ? withBasePath(chapter.thumb) : chapter.thumb,
    })),
  };
}

const courses: Course[] = [withAssetPrefix(zoujinChaoweizhi as Course)];

export function getAllCourses(): Course[] {
  return courses;
}

export function getCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}
