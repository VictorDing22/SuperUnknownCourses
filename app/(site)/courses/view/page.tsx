'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock3, Loader2, Play, Presentation, RotateCw, Smartphone } from 'lucide-react';
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

const SCENE_POLL_MS = 1500;
const HEARTBEAT_MS = 30_000;

/**
 * 通用课程页（详情 + 播放）。
 *
 * 静态导出没法为"运行时新建"的课程生成 HTML，所以统一走 `?slug=`：
 * 课程信息、播放地址都从后端拿，一个页面同时承担详情和播放。
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
  const timer = useLoadTimer(loaded && playing, playAttempt);

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const sceneRef = useRef(1);
  const seenRef = useRef<Set<number>>(new Set([1]));
  const sessionIdRef = useRef<number | null>(null);
  const activeSinceRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('slug') ?? '';
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
    Promise.all([
      fetchCourseDetail(value, session.accessToken),
      fetchProgress(value, session.accessToken),
    ])
      .then(([detail, progress]) => {
        setCourse(detail);
        if (progress && progress.scenesSeen > 0) {
          setProgressInfo({ lastScene: progress.lastScene, scenesSeen: progress.scenesSeen });
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '课程加载失败'))
      .finally(() => setLoading(false));
  }, []);

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

  const start = async () => {
    const session = readAuthSession();
    if (!session || !slug) return;
    setLoaded(false);
    timer.restart();
    setPlaying(true);
    const [link, progress] = await Promise.all([
      fetchPackageUrl(slug, session.accessToken),
      fetchProgress(slug, session.accessToken),
    ]);
    const scene = progress && progress.lastScene > 1 ? progress.lastScene : 1;
    sceneRef.current = scene;
    seenRef.current = new Set([scene]);
    if (scene > 1) setResumedAt(scene);
    setSrc(`${link?.url ?? ''}#scene-${scene}`);
  };

  // 播放中：场景跟踪 + 心跳
  useEffect(() => {
    if (!playing || !src) return;
    const session = readAuthSession();
    if (!session) return;
    activeSinceRef.current = document.visibilityState === 'visible' ? Date.now() : null;

    const sceneTimer = window.setInterval(() => {
      const scene = readSceneFromFrame(frameRef.current);
      if (scene === null || scene === sceneRef.current) {
        seenRef.current.add(sceneRef.current);
        return;
      }
      sceneRef.current = scene;
      seenRef.current.add(scene);
      saveProgress(slug, session.accessToken, scene, seenRef.current.size);
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
      saveProgress(slug, session.accessToken, scene, seenRef.current.size);
      beat(true);
    };
  }, [playing, src, slug, beat]);

  useEffect(() => {
    if (!loaded || resumedAt === null) return;
    const timer = window.setTimeout(() => setResumedAt(null), 5000);
    return () => window.clearTimeout(timer);
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
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        课程广场
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border/70 bg-card">
        {course.cover ? (
          <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={course.cover} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {course.title}
          </h1>
          {course.subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{course.subtitle}</p>
          ) : null}

          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Presentation className="size-3.5" />
              {total} 个场景
            </span>
            {course.stats?.slides ? <span>幻灯片 {course.stats.slides}</span> : null}
            {course.stats?.interactive ? <span>互动 {course.stats.interactive}</span> : null}
            {course.stats?.quizzes ? <span>测验 {course.stats.quizzes}</span> : null}
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              随时可学
            </span>
          </dl>

          {progressInfo ? (
            <div className="mt-5 max-w-sm">
              <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>
                  上次学到第 {progressInfo.lastScene} 幕 · {progressInfo.scenesSeen}/{total} 幕
                </span>
                <span>{Math.min(100, Math.round((progressInfo.scenesSeen / total) * 100))}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, Math.min(100, (progressInfo.scenesSeen / total) * 100))}%` }}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={start}
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="size-4 fill-current" />
            {progressInfo ? '继续学习' : '开始学习'}
          </button>
        </div>
      </div>
    </div>
  );
}
