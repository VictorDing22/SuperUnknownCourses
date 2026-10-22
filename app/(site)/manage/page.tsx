'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CloudUpload, ImagePlus, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { readAuthSession, roleLabel } from '@/lib/auth';
import {
  archiveCourse,
  createCourse,
  fetchManagedCourses,
  updateCourse,
  uploadCourseCover,
  uploadCoursePackage,
  type ManagedCourse,
} from '@/lib/course-admin';

const MAX_PACKAGE_BYTES = 200 * 1024 * 1024;
const MAX_COVER_BYTES = 4 * 1024 * 1024;

type Phase = { progress: number | null; error: string; done: string };
const IDLE: Phase = { progress: null, error: '', done: '' };

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; course: ManagedCourse }
  | { kind: 'cover'; course: ManagedCourse }
  | { kind: 'update'; course: ManagedCourse }
  | null;

/**
 * 教师端 · 课程管理。
 *
 * 右上角「上传课程」新建课程；卡片上可以改名称/副标题、换封面、更新版本、下架。
 */
export default function ManagePage() {
  const [session, setSession] = useState<ReturnType<typeof readAuthSession>>(null);
  const [checked, setChecked] = useState(false);
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialog, setDialog] = useState<DialogState>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [pkgFile, setPkgFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>(IDLE);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const pkgInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

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
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          返回课程广场
        </Link>
      </div>
    );
  }

  const openDialog = (next: DialogState) => {
    setPhase(IDLE);
    setPkgFile(null);
    setCoverFile(null);
    setSlugInput('');
    if (next?.kind === 'edit') {
      setTitle(next.course.title);
      setSubtitle(next.course.subtitle ?? '');
    } else {
      setTitle('');
      setSubtitle('');
    }
    setDialog(next);
  };

  const pickPackage = (file: File | null) => {
    if (!file) return setPkgFile(null);
    if (!/\.(html?|zip)$/i.test(file.name)) return setPhase({ progress: null, error: '只支持 .html 或 .zip 课程包', done: '' });
    if (file.size > MAX_PACKAGE_BYTES) return setPhase({ progress: null, error: '课程包不能超过 200 MB', done: '' });
    setPkgFile(file);
    setPhase(IDLE);
  };

  const pickCover = (file: File | null) => {
    if (!file) return setCoverFile(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setPhase({ progress: null, error: '封面只支持 jpg / png / webp', done: '' });
    if (file.size > MAX_COVER_BYTES) return setPhase({ progress: null, error: '封面不能超过 4 MB', done: '' });
    setCoverFile(file);
    setPhase(IDLE);
  };

  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    try {
      const message = await task();
      setPhase({ progress: null, error: '', done: message });
      if (session) await load(session.accessToken);
    } catch (reason) {
      setPhase({ progress: null, error: reason instanceof Error ? reason.message : '操作失败', done: '' });
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = () => {
    if (!session) return;
    if (!title.trim()) return setPhase({ progress: null, error: '请填写课程名称', done: '' });
    if (!pkgFile) return setPhase({ progress: null, error: '请选择课程包文件', done: '' });
    run(async () => {
      const created = await createCourse(
        {
          title: title.trim(),
          subtitle: subtitle.trim(),
          ...(slugInput.trim() ? { slug: slugInput.trim().toLowerCase() } : {}),
        },
        session.accessToken,
      );
      if (coverFile) await uploadCourseCover(created.slug, coverFile, session.accessToken);
      const result = await uploadCoursePackage(created.slug, pkgFile, session.accessToken, (percent) =>
        setPhase({ progress: percent, error: '', done: '' }),
      );
      return `《${created.title}》创建成功（第 ${result.version} 版）`;
    });
  };

  const submitEdit = (course: ManagedCourse) => {
    if (!session) return;
    if (!title.trim()) return setPhase({ progress: null, error: '请填写课程名称', done: '' });
    run(async () => {
      await updateCourse(course.slug, { title: title.trim(), subtitle: subtitle.trim() }, session.accessToken);
      return '已保存';
    });
  };

  const submitCover = (course: ManagedCourse) => {
    if (!session || !coverFile) return;
    run(async () => {
      await uploadCourseCover(course.slug, coverFile, session.accessToken);
      return '封面已更新';
    });
  };

  const submitPackage = (course: ManagedCourse) => {
    if (!session || !pkgFile) return;
    run(async () => {
      const result = await uploadCoursePackage(course.slug, pkgFile, session.accessToken, (percent) =>
        setPhase({ progress: percent, error: '', done: '' }),
      );
      return `第 ${result.version} 版上传成功`;
    });
  };

  const archive = (course: ManagedCourse) => {
    if (!session) return;
    if (!window.confirm(`下架《${course.title}》？下架后学生看不到，但数据保留。`)) return;
    setBusy(true);
    archiveCourse(course.slug, session.accessToken)
      .then(async () => {
        setNotice(`《${course.title}》已下架，学生端不再显示`);
        await load(session.accessToken);
        window.setTimeout(() => setNotice(''), 5000);
      })
      .catch((reason: unknown) => {
        setNotice(reason instanceof Error ? reason.message : '下架失败');
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">课程管理</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            新建课程并上传课程包，学生下次进入课程时生效。支持 .html / .zip（最大 200 MB）。
          </p>
        </div>
        <button
          type="button"
          onClick={() => openDialog({ kind: 'create' })}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <CloudUpload className="size-4" />
          上传课程
        </button>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-2.5 text-[12.5px] text-primary">
          {notice}
        </p>
      ) : null}

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
                <span className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {course.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground/60">
                      无封面
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{course.subtitle || course.slug}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">{course.totalScenes ?? 0} 个场景</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 px-4 py-3 text-[11.5px]">
                <Link href={`/courses/view/?slug=${encodeURIComponent(course.slug)}`} className="text-muted-foreground transition-colors hover:text-foreground">
                  查看
                </Link>
                <button type="button" onClick={() => openDialog({ kind: 'edit', course })} className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary">
                  <Pencil className="size-3" />
                  编辑
                </button>
                <button type="button" onClick={() => openDialog({ kind: 'cover', course })} className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary">
                  <ImagePlus className="size-3" />
                  封面
                </button>
                <button type="button" onClick={() => openDialog({ kind: 'update', course })} className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary">
                  <CloudUpload className="size-3" />
                  更新版本
                </button>
                <button type="button" onClick={() => archive(course)} className="ml-auto inline-flex items-center gap-1 text-muted-foreground/70 transition-colors hover:text-destructive">
                  <Trash2 className="size-3" />
                  下架
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog ? (
        <Dialog title={dialogTitle(dialog)} onClose={() => (busy ? undefined : setDialog(null))}>
          {dialog.kind === 'create' ? (
            <>
              <Field label="课程名称">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：走进超未知软件工作室" className={inputClass} />
              </Field>
              <Field label="副标题（可选）">
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="例如：工作室入门 · 网页改造实战" className={inputClass} />
              </Field>
              <Field label="课程标识（可选）">
                <input value={slugInput} onChange={(e) => setSlugInput(e.target.value)} placeholder="例如：zoujin-chaoweizhi" className={inputClass} />
                <span className="mt-1 block text-[11px] text-muted-foreground">用于课程链接，只能用小写字母、数字和横线；留空自动生成。</span>
              </Field>
              <Field label="课程封面（可选）">
                <CoverPicker file={coverFile} onPick={() => coverInput.current?.click()} />
                <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
              </Field>
              <Field label="课程包文件">
                <PackagePicker file={pkgFile} onPick={() => pkgInput.current?.click()} />
                <input ref={pkgInput} type="file" accept=".html,.htm,.zip" className="hidden" onChange={(e) => pickPackage(e.target.files?.[0] ?? null)} />
              </Field>
              <ProgressBlock phase={phase} />
              <Messages phase={phase} />
              <Actions busy={busy} done={Boolean(phase.done)} onClose={() => setDialog(null)} onSubmit={submitCreate} label="创建并上传" disabled={!title.trim() || !pkgFile} />
            </>
          ) : null}

          {dialog.kind === 'edit' ? (
            <>
              <Field label="课程名称">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </Field>
              <Field label="副标题">
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputClass} />
              </Field>
              <p className="-mt-1 text-[11px] text-muted-foreground">课程标识（{dialog.course.slug}）不会变，链接保持有效。</p>
              <Messages phase={phase} />
              <Actions busy={busy} done={Boolean(phase.done)} onClose={() => setDialog(null)} onSubmit={() => submitEdit(dialog.course)} label="保存" disabled={!title.trim()} />
            </>
          ) : null}

          {dialog.kind === 'cover' ? (
            <>
              <p className="-mt-1 text-[12px] text-muted-foreground">{dialog.course.title}</p>
              <Field label="封面图片">
                <CoverPicker file={coverFile} onPick={() => coverInput.current?.click()} />
                <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
              </Field>
              <p className="-mt-1 text-[11px] text-muted-foreground">建议 16:9，jpg/png/webp，最大 4 MB，上传后立即替换。</p>
              <Messages phase={phase} />
              <Actions busy={busy} done={Boolean(phase.done)} onClose={() => setDialog(null)} onSubmit={() => submitCover(dialog.course)} label="上传封面" disabled={!coverFile} />
            </>
          ) : null}

          {dialog.kind === 'update' ? (
            <>
              <p className="-mt-1 text-[12px] text-muted-foreground">{dialog.course.title}</p>
              <Field label="课程包文件">
                <PackagePicker file={pkgFile} onPick={() => pkgInput.current?.click()} />
                <input ref={pkgInput} type="file" accept=".html,.htm,.zip" className="hidden" onChange={(e) => pickPackage(e.target.files?.[0] ?? null)} />
              </Field>
              <ProgressBlock phase={phase} />
              <Messages phase={phase} />
              <Actions busy={busy} done={Boolean(phase.done)} onClose={() => setDialog(null)} onSubmit={() => submitPackage(dialog.course)} label="上传新版本" disabled={!pkgFile} />
            </>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  );
}

function dialogTitle(dialog: NonNullable<DialogState>): string {
  if (dialog.kind === 'create') return '上传课程';
  if (dialog.kind === 'edit') return '编辑课程信息';
  if (dialog.kind === 'cover') return '更换封面';
  return '更新课程包';
}

const inputClass =
  'mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary';

const dropClass =
  'mt-1.5 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-7 text-center transition-colors hover:border-primary hover:bg-primary/[0.04]';

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-border/70 bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary">
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

function PackagePicker({ file, onPick }: { file: File | null; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className={dropClass}>
      <CloudUpload className="size-6 text-muted-foreground" />
      {file ? (
        <>
          <span className="text-[13px] text-foreground">{file.name}</span>
          <span className="text-[11px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB · 点击重新选择</span>
        </>
      ) : (
        <>
          <span className="text-[13px] text-foreground">点击选择 .html 或 .zip</span>
          <span className="text-[11px] text-muted-foreground">单个文件最大 200 MB</span>
        </>
      )}
    </button>
  );
}

function CoverPicker({ file, onPick }: { file: File | null; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className={dropClass}>
      <ImagePlus className="size-6 text-muted-foreground" />
      {file ? (
        <>
          <span className="text-[13px] text-foreground">{file.name}</span>
          <span className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · 点击重新选择</span>
        </>
      ) : (
        <>
          <span className="text-[13px] text-foreground">点击选择封面图片</span>
          <span className="text-[11px] text-muted-foreground">jpg / png / webp，最大 4 MB</span>
        </>
      )}
    </button>
  );
}

function ProgressBlock({ phase }: { phase: Phase }) {
  if (phase.progress === null) return null;
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${phase.progress}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">上传中 {phase.progress}%</p>
    </div>
  );
}

function Messages({ phase }: { phase: Phase }) {
  return (
    <>
      {phase.error ? (
        <p className="rounded-lg border border-destructive/25 bg-destructive/[0.05] px-3 py-2 text-[12px] text-destructive">{phase.error}</p>
      ) : null}
      {phase.done ? (
        <p className="rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-[12px] text-primary">{phase.done}</p>
      ) : null}
    </>
  );
}

function Actions({
  busy,
  done,
  onClose,
  onSubmit,
  label,
  disabled,
}: {
  busy: boolean;
  done: boolean;
  onClose: () => void;
  onSubmit: () => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <div className="-mx-5 -mb-4 flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
      <button type="button" onClick={onClose} disabled={busy} className="h-9 rounded-lg border border-border px-4 text-[13px] text-foreground transition-colors hover:bg-secondary disabled:opacity-50">
        {done ? '关闭' : '取消'}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || disabled || done}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {busy ? '处理中…' : label}
      </button>
    </div>
  );
}
