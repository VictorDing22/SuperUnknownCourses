'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CloudUpload, FileCode2, Loader2, X } from 'lucide-react';
import { readAuthSession, roleLabel } from '@/lib/auth';
import {
  fetchManagedCourses,
  uploadCoursePackage,
  type ManagedCourse,
  type UploadResult,
} from '@/lib/course-admin';

const MAX_BYTES = 200 * 1024 * 1024;

type DialogState = {
  course: ManagedCourse;
  file: File | null;
  progress: number | null;
  error: string;
  result: UploadResult | null;
};

/**
 * 教师端 · 课程管理。
 *
 * 课程中心自己的页面：列出课程、上传课程包（.html / .zip）。
 * 只有教师能进；后端对上传接口也会再校验一次角色。
 */
export default function ManagePage() {
  const [session, setSession] = useState<ReturnType<typeof readAuthSession>>(null);
  const [checked, setChecked] = useState(false);
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSession(readAuthSession());
    setChecked(true);
  }, []);

  const load = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    try {
      setCourses(await fetchManagedCourses(token));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '课程目录加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checked || !session) return;
    if (session.user.role !== 'teacher') return;
    load(session.accessToken);
  }, [checked, session, load]);

  if (!checked) return null;

  if (!session) return null;

  if (session.user.role !== 'teacher') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-foreground">仅教师可访问</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          当前账号是「{roleLabel(session.user.role)}」，课程包上传只对教师开放。
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          返回课程广场
        </Link>
      </div>
    );
  }

  const pickFile = (file: File | null) => {
    if (!dialog) return;
    if (!file) {
      setDialog({ ...dialog, file: null });
      return;
    }
    if (!/\.(html?|zip)$/i.test(file.name)) {
      setDialog({ ...dialog, file: null, error: '只支持 .html 或 .zip 课程包' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setDialog({ ...dialog, file: null, error: '课程包不能超过 200 MB' });
      return;
    }
    setDialog({ ...dialog, file, error: '', result: null });
  };

  const submit = async () => {
    if (!dialog || !dialog.file || !session) return;
    setDialog({ ...dialog, progress: 0, error: '', result: null });
    try {
      const result = await uploadCoursePackage(dialog.course.slug, dialog.file, session.accessToken, (percent) =>
        setDialog((current) => (current ? { ...current, progress: percent } : current)),
      );
      setDialog((current) => (current ? { ...current, progress: null, result } : current));
      load(session.accessToken);
    } catch (reason) {
      setDialog((current) =>
        current
          ? { ...current, progress: null, error: reason instanceof Error ? reason.message : '上传失败' }
          : current,
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">课程管理</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            上传或更新课程包，学生下次进入课程时生效。支持单个 .html 或 .zip（最大 200 MB）。
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {session.user.label} · {roleLabel(session.user.role)}
        </span>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在加载课程…
        </div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-destructive/25 bg-destructive/[0.05] px-5 py-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {courses.map((course) => (
            <div
              key={course.slug}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card"
            >
              <div className="flex items-center gap-4 p-4">
                <span className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {course.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.cover} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {course.subtitle || course.slug}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    {course.totalScenes ?? 0} 个场景
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
                <Link
                  href={`/courses/${course.slug}/`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  查看课程
                </Link>
                <button
                  type="button"
                  onClick={() => setDialog({ course, file: null, progress: null, error: '', result: null })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <CloudUpload className="size-3.5" />
                  上传课程包
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
            <header className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-foreground">上传课程包</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{dialog.course.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setDialog(null)}
                disabled={dialog.progress !== null}
                aria-label="关闭"
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="space-y-4 px-5 py-4">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={dialog.progress !== null}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-7 text-center transition-colors hover:border-primary hover:bg-primary/[0.04] disabled:opacity-60"
              >
                <CloudUpload className="size-6 text-muted-foreground" />
                {dialog.file ? (
                  <>
                    <span className="text-[13px] text-foreground">{dialog.file.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {(dialog.file.size / 1024 / 1024).toFixed(1)} MB · 点击重新选择
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[13px] text-foreground">点击选择 .html 或 .zip</span>
                    <span className="text-[11px] text-muted-foreground">单个文件最大 200 MB</span>
                  </>
                )}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".html,.htm,.zip"
                className="hidden"
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
              />

              {dialog.progress !== null ? (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200"
                      style={{ width: `${dialog.progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">上传中 {dialog.progress}%</p>
                </div>
              ) : null}

              {dialog.error ? (
                <p className="rounded-lg border border-destructive/25 bg-destructive/[0.05] px-3 py-2 text-[12px] text-destructive">
                  {dialog.error}
                </p>
              ) : null}

              {dialog.result ? (
                <p className="rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-[12px] text-primary">
                  第 {dialog.result.version} 版上传成功 · {(dialog.result.sizeBytes / 1024 / 1024).toFixed(1)} MB
                  <br />
                  学生下次进入课程时生效。
                </p>
              ) : null}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setDialog(null)}
                disabled={dialog.progress !== null}
                className="h-9 rounded-lg border border-border px-4 text-[13px] text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {dialog.result ? '关闭' : '取消'}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!dialog.file || dialog.progress !== null || dialog.result !== null}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dialog.progress !== null ? <Loader2 className="size-3.5 animate-spin" /> : <FileCode2 className="size-3.5" />}
                {dialog.progress !== null ? '上传中…' : '开始上传'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
