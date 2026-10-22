'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { EurasiaMark } from '@/components/eurasia-mark';
import type { Course } from '@/lib/courses';
import { readAuthSession } from '@/lib/auth';
import { fetchProgress, readSceneFromFrame, saveProgress, sendHeartbeat } from '@/lib/learning';
import { cn } from '@/lib/utils';

const SCENE_POLL_MS = 1500;
const HEARTBEAT_MS = 30_000;

function parseSceneHash(hash: string): number | null {
  const matched = /scene-(\d+)/.exec(hash);
  return matched ? Number(matched[1]) : null;
}

export function PlayerShell({ course }: { course: Course }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  /** 嵌入模式：被跨界系统用 iframe 打开时带 ?embed=1，隐藏平台自己的返回入口 */
  const [embedded, setEmbedded] = useState(false);
  /** 续播提示：从上次进度恢复时短暂显示 */
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const [resumeVisible, setResumeVisible] = useState(true);

  const sceneRef = useRef(1);
  const seenRef = useRef<Set<number>>(new Set([1]));
  const sessionIdRef = useRef<number | null>(null);
  const activeSinceRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    setEmbedded(new URLSearchParams(window.location.search).has('embed'));
  }, []);

  // 续播提示在播放器真正加载完成后再计时隐藏（加载本身可能要几秒）
  useEffect(() => {
    if (!loaded || resumedAt === null) return;
    const timer = window.setTimeout(() => setResumeVisible(false), 6000);
    return () => window.clearTimeout(timer);
  }, [loaded, resumedAt]);

  // 嵌入模式下把 ESC 转给外层容器：iframe 获得焦点后，父页收不到键盘事件
  useEffect(() => {
    if (!embedded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.fullscreenElement) return;
      window.parent?.postMessage({ type: 'superunknown:close-course' }, window.location.origin);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [embedded]);

  // 起始场景：URL hash 优先（深链），否则续播到上次的进度
  useEffect(() => {
    let cancelled = false;
    const apply = (scene: number, resumed: boolean) => {
      if (cancelled) return;
      sceneRef.current = scene;
      seenRef.current = new Set([scene]);
      setSrc(`${course.htmlPath}#scene-${scene}`);
      if (resumed) setResumedAt(scene);
    };

    const hashScene = parseSceneHash(window.location.hash);
    if (hashScene) {
      apply(hashScene, false);
      return;
    }

    const session = readAuthSession();
    if (!session) {
      apply(1, false);
      return;
    }

    fetchProgress(course.slug, session.accessToken).then((progress) => {
      const scene = progress && progress.lastScene > 1 ? progress.lastScene : 1;
      apply(scene, scene > 1);
    });

    return () => {
      cancelled = true;
    };
  }, [course.slug, course.htmlPath]);

  /** 上报一次心跳；ended 时结算离开时间 */
  const beat = useCallback(
    (ended: boolean) => {
      const session = readAuthSession();
      if (!session) return;
      const now = Date.now();
      if (activeSinceRef.current !== null) {
        accumulatedRef.current += now - activeSinceRef.current;
        activeSinceRef.current = ended ? null : now;
      }
      const scene = readSceneFromFrame(frameRef.current) ?? sceneRef.current;
      sendHeartbeat(course.slug, session.accessToken, {
        sessionId: sessionIdRef.current,
        durationMs: accumulatedRef.current,
        lastScene: scene,
        scenesSeen: seenRef.current.size,
        ended,
      }).then((result) => {
        if (result) sessionIdRef.current = result.sessionId;
      });
    },
    [course.slug],
  );

  // 场景跟踪 + 定时心跳 + 切后台暂停计时
  useEffect(() => {
    if (!src) return;
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
      saveProgress(course.slug, token, scene, seenRef.current.size);
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
    const onPageHide = () => beat(true);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(sceneTimer);
      window.clearInterval(beatTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      const scene = readSceneFromFrame(frameRef.current) ?? sceneRef.current;
      saveProgress(course.slug, token, scene, seenRef.current.size);
      beat(true);
    };
  }, [src, course.slug, beat]);

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

      {embedded ? null : (
        <Link
          href={`/courses/${course.slug}/`}
          className="absolute left-1/2 top-2 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900/55 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-slate-900/75 hover:text-white sm:inline-flex"
        >
          <ArrowLeft className="size-3.5" />
          返回课程
        </Link>
      )}

      {resumedAt !== null && loaded && resumeVisible ? (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary/95 px-3.5 py-1.5 text-[11.5px] font-medium text-white shadow-lg">
          已回到上次学习的位置 · 第 {resumedAt} 幕
        </div>
      ) : null}

      <div
        className={cn(
          'absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-center transition-opacity duration-500',
          loaded && 'pointer-events-none opacity-0',
        )}
        aria-hidden={loaded}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute inset-0 bg-grid opacity-20" />
        </div>

        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white/5 text-primary ring-1 ring-white/10">
          <EurasiaMark className="h-7 w-auto" />
        </div>

        <div className="relative space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-white/50">SUPERUNKNOWN</p>
          <h1 className="text-balance text-xl font-semibold text-white sm:text-2xl">
            {course.title}
          </h1>
          <p className="text-sm text-white/50">正在加载课程…</p>
        </div>

        <div className="relative mt-1 flex items-center gap-3 text-xs text-white/45">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>首次加载约 8 MB，请稍候</span>
        </div>

        <div className="relative mt-2 h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
