'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Atom,
  ChevronRight,
  CircleHelp,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  Presentation,
  RotateCw,
  Smartphone,
} from 'lucide-react';
import { readAuthSession } from '@/lib/auth';
import { fetchCourseDetail, type CourseDetail } from '@/lib/course-admin';
import {
  fetchPackageUrl,
  fetchProgress,
  readSceneFromFrame,
  saveProgress,
  sendHeartbeat,
} from '@/lib/learning';
import { useLoadTimer } from '@/lib/load-timer';
import { BASE_PATH } from '@/lib/site';
import { getBundledPlayer } from '@/lib/courses';

const SCENE_POLL_MS = 1500;
const HEARTBEAT_MS = 30_000;

/**
 * 通用课程页（详情 + 播放）。
 *
 * 静态导出没法为"运行时新建"的课程生成 HTML，所以统一走 `?slug=`：
 * 版式与静态详情页保持一致，点封面或按钮进入播放。
 */
export default function CourseViewPage() {
  const [slug, setSlug] = useState('');
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [progressInfo, setProgressInfo] = useState<{ lastScene: number; scenesSeen: number } | null>(null);

  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const [playAttempt, setPlayAttempt] = useState(0);
  const [playError, setPlayError] = useState('');
  const timer = useLoadTimer(loaded && playing, playAttempt);

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const sceneRef = useRef(1);
  const seenRef = useRef<Set<number>>(new Set([1]));
  const sessionIdRef = useRef<number | null>(null);
  const activeSinceRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  const start = useCallback(async () => {
    const session = readAuthSession();
    if (!session) return;
    const value = new URLSearchParams(window.location.search).get('slug') ?? '';
    if (!value) return;
    setLoaded(false);
    setPlaying(true);
    const [link, progress] = await Promise.all([
      fetchPackageUrl(value, session.accessToken),
      fetchProgress(value, session.accessToken),
    ]);
    const base = link?.url ?? getBundledPlayer(value);
    if (!base) {
      setPlaying(false);
      setPlayError('这门课还没有上传课程包，请老师先在课程管理里上传。');
      return;
    }
    setPlayError('');
    const scene = progress && progress.lastScene > 1 ? progress.lastScene : 1;
    sceneRef.current = scene;
    seenRef.current = new Set([scene]);
    if (scene > 1) setResumedAt(scene);
    setSrc(`${base}#scene-${scene}`);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('slug') ?? '';
    setSlug(value);
    if (!value) {
      setError('缺少课程标识');
      setLoading(false);
      return;
    }
    const session = readAuthSession();
    if (!session) {
      setError('登录状态已失效');
      setLoading(false);
      return;
    }
    Promise.all([fetchCourseDetail(value, session.accessToken), fetchProgress(value, session.accessToken)])
      .then(([detail, progress]) => {
        setCourse(detail);
        if (progress && progress.scenesSeen > 0) {
          setProgressInfo({ lastScene: progress.lastScene, scenesSeen: progress.scenesSeen });
        }
        if (params.get('play') === '1') start();
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '课程加载失败'))
      .finally(() => setLoading(false));
  }, [start]);

  const beat = useCallback(
    (ended: boolean) => {
      const session = readAuthSession();
      if (!session || !slug) return;
      const now = Date.now();
      if (activeSinceRef.current !== null) {
        accumulatedRef.current += now - activeSinceRef.current;
        activeSinceRef.current = ended ? null : now;
      }
      const scene = readSceneFromFrame(frameRef.current) ?? sceneRef.current;
      sendHeartbeat(slug, session.accessToken, {
        sessionId: sessionIdRef.current,
        durationMs: accumulatedRef.current,
        lastScene: scene,
        scenesSeen: seenRef.current.size,
        ended,
      }).then((result) => {
        if (result) sessionIdRef.current = result.sessionId;
      });
    },
    [slug],
  );

  useEffect(() => {
    if (!playing || !src) return;
    const session = readAuthSession();
    if (!session) return;
    const token = session.accessToken;
    activeSinceRef.current = document.visibilityState === 'visible' ? Date.now() : null;

    const sceneTimer = window.setInterval(() => {
      const scene = readSceneFromFrame(frameRef.current);
      if (scene === null || scene === sceneRef.current) {
        seenRef.current.add(sceneRef.current);
        return;
      }
      sceneRef.current = scene;
      seenRef.current.add(scene);
      saveProgress(slug, token, scene, seenRef.current.size).then((value) => {
        if (value) setProgressInfo({ lastScene: value.lastScene, scenesSeen: value.scenesSeen });
      });
    }, SCENE_POLL_MS);
    const beatTimer = window.setInterval(() => beat(false), HEARTBEAT_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        beat(false);
        activeSinceRef.current = null;
      } else {
        activeSinceRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(sceneTimer);
      window.clearInterval(beatTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      const scene = readSceneFromFrame(frameRef.current) ?? sceneRef.current;
      saveProgress(slug, token, scene, seenRef.current.size);
      beat(true);
    };
  }, [playing, src, slug, beat]);

  useEffect(() => {
    if (!loaded || resumedAt === null) return;
    const timerId = window.setTimeout(() => setResumedAt(null), 5000);
    return () => window.clearTimeout(timerId);
  }, [loaded, resumedAt]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        正在加载课程…
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-lg font-semibold text-foreground">课程加载失败</p>
        <p className="mt-2 text-sm text-muted-foreground">{error || '课程不存在'}</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          返回课程广场
        </Link>
      </div>
    );
  }

  if (playing) {
    return (
      <div className="relative h-dvh w-full overflow-hidden bg-slate-950">
        {src ? (
          <iframe
            ref={frameRef}
            src={src}
            title={course.title}
            className="h-dvh w-full border-0"
            allow="autoplay; fullscreen; clipboard-write"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
        ) : null}
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setSrc(null);
          }}
          className="absolute left-1/2 top-2 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900/60 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-slate-900/80 hover:text-white sm:inline-flex"
        >
          <ArrowLeft className="size-3.5" />
          返回课程
        </button>
        {resumedAt !== null && loaded ? (
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary/95 px-3.5 py-1.5 text-[11.5px] font-medium text-white shadow-lg">
            已回到上次学习的位置 · 第 {resumedAt} 幕
          </div>
        ) : null}
        {!loaded ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-white/60">
            {timer.failed ? (
              <>
                <h2 className="text-lg font-semibold text-white">课程加载失败</h2>
                <p className="max-w-sm text-sm leading-relaxed text-white/60">
                  等待 {timer.seconds} 秒仍未完成。课程包约 8 MB，移动网络较慢时可能失败。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPlayAttempt((value) => value + 1);
                    timer.restart();
                    start();
                  }}
                  className="mt-1 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <RotateCw className="size-4" />
                  重试
                </button>
              </>
            ) : (
              <>
                <Loader2 className="size-5 animate-spin text-primary" />
                <p className="text-sm">
                  {timer.slow ? `网络较慢，继续加载中…（已等待 ${timer.seconds} 秒）` : '正在加载课程…'}
                </p>
                {timer.slow ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-white/35">
                    <Smartphone className="size-3.5" />
                    手机建议横屏观看；4G 下通常需要 10–30 秒
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  const total = course.totalScenes || 11;
  const percent = progressInfo ? Math.min(100, Math.round((progressInfo.scenesSeen / total) * 100)) : 0;
  const playHref = `${BASE_PATH}/courses/view/?slug=${encodeURIComponent(course.slug)}&play=1`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pt-10 lg:px-8">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="面包屑">
        <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          课程广场
        </Link>
        <ChevronRight className="size-3.5 opacity-40" />
        <span className="truncate text-foreground/80">{course.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <button
          type="button"
          onClick={start}
          className="group relative block aspect-video w-full overflow-hidden rounded-3xl bg-slate-900 text-left shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] ring-1 ring-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`播放课程：${course.title}`}
        >
          {course.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.cover}
              alt={course.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-slate-950/5" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-xl transition-transform duration-300 group-hover:scale-105">
              <Play className="ml-1 size-6 fill-current" />
            </span>
          </div>
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
            <span className="text-xs text-white/80">
              {total} 个场景{course.stats?.interactive ? ` · ${course.stats.interactive} 个互动关卡` : ''}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] text-white/90 backdrop-blur-sm">
              点击播放
            </span>
          </div>
        </button>

        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            SUPERUNKNOWN 工作室课程
          </span>

          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {course.title}
          </h1>
          {course.subtitle ? <p className="mt-2 text-sm text-muted-foreground">{course.subtitle}</p> : null}

          {course.tags && course.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {course.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <dl className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Presentation className="size-3.5 text-sky-500" />
                场景
              </dt>
              <dd className="mt-1 text-xl font-semibold tracking-tight text-foreground">{total}</dd>
            </div>
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Atom className="size-3.5 text-violet-500" />
                互动关卡
              </dt>
              <dd className="mt-1 text-xl font-semibold tracking-tight text-foreground">{course.stats?.interactive ?? 0}</dd>
            </div>
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CircleHelp className="size-3.5 text-amber-500" />
                测验
              </dt>
              <dd className="mt-1 text-xl font-semibold tracking-tight text-foreground">{course.stats?.quizzes ?? 0}</dd>
            </div>
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="size-3.5 text-emerald-500" />
                时长
              </dt>
              <dd className="mt-1 text-sm font-semibold tracking-tight text-foreground">{course.duration || '随时可学'}</dd>
            </div>
          </dl>

          {playError ? (
            <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-2.5 text-[12.5px] text-destructive">
              {playError}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={start}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md"
            >
              <Play className="size-4 fill-current" />
              {progressInfo ? '继续学习' : '开始学习'}
            </button>
            <a
              href={playHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-secondary"
            >
              <ExternalLink className="size-4" />
              新窗口打开
            </a>
          </div>

          {progressInfo ? (
            <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border/70">
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="font-medium text-foreground/80">上次学到第 {progressInfo.lastScene} 幕</span>
                <span className="text-muted-foreground">
                  {progressInfo.scenesSeen}/{total} 幕 · {percent}%
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(percent, 4)}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
