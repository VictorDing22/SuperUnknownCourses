'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CloudUpload, Loader2, Pencil, X } from 'lucide-react';
import { readAuthSession, roleLabel } from '@/lib/auth';
import {
  createCourse,
  fetchManagedCourses,
  uploadCoursePackage,
  type ManagedCourse,
} from '@/lib/course-admin';

const MAX_BYTES = 200 * 1024 * 1024;

type UploadPhase = { progress: number | null; error: string; done: string };

const IDLE: UploadPhase = { progress: null, error: '', done: '' };

/**
 * 教师端 · 课程管理。
 *
 * 右上角「上传课程」新建一门课并上传课程包；已有课程可在卡片上单独更新版本。
 */
export default function ManagePage() {
  const [session, setSession] = useState<ReturnType<typeof readAuthSession>>(null);
  const [checked, setChecked] = useState(false);
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>(IDLE);

  const [updating, setUpdating] = useState<ManagedCourse | null>(null);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updatePhase, setUpdatePhase] = useState<UploadPhase>(IDLE);

  const createFileRef = useRef<HTMLInputElement | null>(null);
  const updateFileRef = useRef<HTMLInputElement | null>(null);

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
    if (!checked || !session || session.user.role !== 'teacher') return;
    load(session.accessToken);
  }, [checked, session, load]);

  if (!checked || !session) return null;

  if (session.user.role !== 'teacher') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-foreground">仅教师可访问</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          当前账号是「{roleLabel(session.user.role)}」，课程上传只对教师开放。
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

  const pick = (
    selected: File | null,
    setter: (value: File | null) => void,
    setPhaseFn: (value: UploadPhase) => void,
  ) => {
    if (!selected) return setter(null);
    if (!/\.(html?|zip)$/i.test(selected.name)) {
      setPhaseFn({ progress: null, error: '只支持 .html 或 .zip 课程包', done: '' });
      return setter(null);
    }
    if (selected.size > MAX_BYTES) {
      setPhaseFn({ progress: null, error: '课程包不能超过 200 MB', done: '' });
      return setter(null);
    }
    setter(selected);
    setPhaseFn(IDLE);
  };

  const submitCreate = async () => {
    if (!session) return;
    if (!title.trim()) return setPhase({ progress: null, error: '请填写课程名称', done: '' });
    if (!file) return setPhase({ progress: null, error: '请选择课程包文件', done: '' });

    setPhase(IDLE);
    try {
      const created = await createCourse(
        {
          title: title.trim(),
          subtitle: subtitle.trim(),
          ...(slugInput.trim() ? { slug: slugInput.trim().toLowerCase() } : {}),
        },
        session.accessToken,
      );
      setPhase({ progress: 0, error: '', done: '' });
      const result = await uploadCoursePackage(created.slug, file, session.accessToken, (percent) =>
        setPhase({ progress: percent, error: '', done: '' }),
      );
      setPhase({
        progress: null,
        error: '',
        done: `《${created.title}》创建成功（第 ${result.version} 版）`,
      });
      setTitle('');
      setSubtitle('');
      setSlugInput('');
      setFile(null);
      load(session.accessToken);
    } catch (reason) {
      setPhase({
        progress: null,
        error: reason instanceof Error ? reason.message : '创建失败，请稍后重试',
        done: '',
      });
    }
  };

  const submitUpdate = async () => {
    if (!session || !updating || !updateFile) return;
    setUpdatePhase({ progress: 0, error: '', done: '' });
    try {
      const result = await uploadCoursePackage(updating.slug, updateFile, session.accessToken, (percent) =>
        setUpdatePhase({ progress: percent, error: '', done: '' }),
      );
      setUpdatePhase({ progress: null, error: '', done: `第 ${result.version} 版上传成功` });
      load(session.accessToken);
    } catch (reason) {
      setUpdatePhase({
        progress: null,
        error: reason instanceof Error ? reason.message : '上传失败',
        done: '',
      });
    }
  };

  const busy = phase.progress !== null || updatePhase.progress !== null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">课程管理</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            新建课程并上传课程包，学生下次进入课程时生效。支持单个 .html 或 .zip（最大 200 MB）。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setPhase(IDLE);
            setTitle('');
            setSubtitle('');
            setSlugInput('');
            setFile(null);
          }}
          disabled={busy}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <CloudUpload className="size-4" />
          上传课程
        </button>
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
      ) : courses.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">还没有课程</p>
          <p className="mt-1.5 text-xs text-muted-foreground">点右上角「上传课程」新建第一门课。</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {courses.map((course) => (
            <div key={course.slug} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
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
                  href={`/courses/view/?slug=${encodeURIComponent(course.slug)}`}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  查看课程
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUpdating(course);
                    setUpdateFile(null);
                    setUpdatePhase(IDLE);
                  }}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <Pencil className="size-3.5" />
                  更新版本
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <Dialog
          title="上传课程"
          onClose={() => (phase.progress === null ? setCreating(false) : undefined)}
        >
          <Field label="课程名称">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：走进超未知软件工作室"
              className={inputClass}
            />
          </Field>
          <Field label="副标题（可选）">
            <input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="例如：工作室入门 · 网页改造实战"
              className={inputClass}
            />
          </Field>
          <Field label="课程标识（可选）">
            <input
              value={slugInput}
              onChange={(event) => setSlugInput(event.target.value)}
              placeholder="例如：zoujin-chaoweizhi"
              className={inputClass}
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              用于课程链接，只能用小写字母、数字和横线；留空自动生成。
            </span>
          </Field>
          <Field label="课程包文件">
            <button
              type="button"
              onClick={() => createFileRef.current?.click()}
              disabled={phase.progress !== null}
              className={dropClass}
            >
              <CloudUpload className="size-6 text-muted-foreground" />
              {file ? (
                <>
                  <span className="text-[13px] text-foreground">{file.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · 点击重新选择
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
              ref={createFileRef}
              type="file"
              accept=".html,.htm,.zip"
              className="hidden"
              onChange={(event) => pick(event.target.files?.[0] ?? null, setFile, setPhase)}
            />
          </Field>

          <Progress phase={phase} />
          <PhaseMessages phase={phase} />

          <DialogActions
            busy={phase.progress !== null}
            done={Boolean(phase.done)}
            onClose={() => setCreating(false)}
            onSubmit={submitCreate}
            submitLabel="创建并上传"
            disabled={!title.trim() || !file}
          />
        </Dialog>
      ) : null}

      {updating ? (
        <Dialog
          title="更新课程包"
          onClose={() => (updatePhase.progress === null ? setUpdating(null) : undefined)}
        >
          <p className="-mt-1 text-[12px] text-muted-foreground">{updating.title}</p>
          <Field label="课程包文件">
            <button
              type="button"
              onClick={() => updateFileRef.current?.click()}
              disabled={updatePhase.progress !== null}
              className={dropClass}
            >
              <CloudUpload className="size-6 text-muted-foreground" />
              {updateFile ? (
                <>
                  <span className="text-[13px] text-foreground">{updateFile.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {(updateFile.size / 1024 / 1024).toFixed(1)} MB · 点击重新选择
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
              ref={updateFileRef}
              type="file"
              accept=".html,.htm,.zip"
              className="hidden"
              onChange={(event) => pick(event.target.files?.[0] ?? null, setUpdateFile, setUpdatePhase)}
            />
          </Field>

          <Progress phase={updatePhase} />
          <PhaseMessages phase={updatePhase} />

          <DialogActions
            busy={updatePhase.progress !== null}
            done={Boolean(updatePhase.done)}
            onClose={() => setUpdating(null)}
            onSubmit={submitUpdate}
            submitLabel="上传新版本"
            disabled={!updateFile}
          />
        </Dialog>
      ) : null}
    </div>
  );
}

const inputClass =
  'mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary';

const dropClass =
  'mt-1.5 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-7 text-center transition-colors hover:border-primary hover:bg-primary/[0.04] disabled:opacity-60';

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="space-y-4 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}

function Progress({ phase }: { phase: UploadPhase }) {
  if (phase.progress === null) return null;
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${phase.progress}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">上传中 {phase.progress}%</p>
    </div>
  );
}

function PhaseMessages({ phase }: { phase: UploadPhase }) {
  return (
    <>
      {phase.error ? (
        <p className="rounded-lg border border-destructive/25 bg-destructive/[0.05] px-3 py-2 text-[12px] text-destructive">
          {phase.error}
        </p>
      ) : null}
      {phase.done ? (
        <p className="rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-[12px] text-primary">
          {phase.done}
        </p>
      ) : null}
    </>
  );
}

function DialogActions({
  busy,
  done,
  onClose,
  onSubmit,
  submitLabel,
  disabled,
}: {
  busy: boolean;
  done: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled: boolean;
}) {
  return (
    <div className="-mx-5 -mb-4 flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="h-9 rounded-lg border border-border px-4 text-[13px] text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
      >
        {done ? '关闭' : '取消'}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || disabled || done}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {busy ? '处理中…' : submitLabel}
      </button>
    </div>
  );
}
