import zoujinChaoweizhi from '@/content/courses/zoujin-chaoweizhi.json';

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

const courses = [zoujinChaoweizhi as Course];

export function getAllCourses(): Course[] {
  return courses;
}

export function getCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}
