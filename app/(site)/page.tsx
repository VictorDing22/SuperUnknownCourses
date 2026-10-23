import { CourseExplorer } from '@/components/course-explorer';
import { getAllCourses } from '@/lib/courses';
import { IS_CAMPUS } from '@/lib/site';

export default function HomePage() {
  const courses = getAllCourses();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              课程广场
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              把工作室的互动课程，装进一个随时能打开的页面。选一门课，点开就能学。
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 ring-1 ring-border/70">
                <span className="size-1.5 rounded-full bg-primary" />
                共 {courses.length} 门课程
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <CourseExplorer fallback={courses} />

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground/70">
          {IS_CAMPUS
            ? '提示：课程播放器为离线版本；请使用 Chrome、Edge 或 Safari 打开，并允许声音播放。'
            : '提示：课程播放器为离线版本，点开后无需登录；建议使用 Chrome、Edge 或 Safari，并允许声音播放。'}
        </p>
      </section>
    </div>
  );
}
