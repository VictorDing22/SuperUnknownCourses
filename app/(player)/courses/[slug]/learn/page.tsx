import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlayerShell } from '@/components/player-shell';
import { getAllCourses, getCourse } from '@/lib/courses';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllCourses().map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: '课程不存在' };

  return {
    title: `${course.title} · 播放`,
    description: course.description,
  };
}

export default async function LearnPage({ params }: PageProps) {
  const { slug } = await params;
  const course = getCourse(slug);

  if (!course) notFound();

  return <PlayerShell course={course} />;
}
