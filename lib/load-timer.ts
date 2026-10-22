'use client';

import { useEffect, useRef, useState } from 'react';

/** 超过这个时间还没加载完，提示"网络较慢" */
export const SLOW_AFTER_MS = 10_000;
/** 超过这个时间判定加载失败，给重试和新窗口出口 */
export const FAIL_AFTER_MS = 45_000;

export interface LoadTimer {
  elapsed: number;
  seconds: number;
  slow: boolean;
  failed: boolean;
  restart: () => void;
}

/**
 * 加载计时器：给"还在动"的反馈，并在超时后允许重试。
 * 8MB 的课程包在移动网络下经常要几十秒，没有计时就只有一个无限转圈。
 */
export function useLoadTimer(loaded: boolean, resetKey: unknown): LoadTimer {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (loaded) return;
    startedAt.current = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => window.clearInterval(timer);
  }, [loaded, resetKey]);

  const restart = () => {
    startedAt.current = Date.now();
    setElapsed(0);
  };

  return {
    elapsed,
    seconds: Math.floor(elapsed / 1000),
    slow: !loaded && elapsed >= SLOW_AFTER_MS,
    failed: !loaded && elapsed >= FAIL_AFTER_MS,
    restart,
  };
}
