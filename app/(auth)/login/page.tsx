'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { EurasiaMark } from '@/components/eurasia-mark';
import {
  AuthApiError,
  fetchPublicClasses,
  readRememberedAccount,
  rememberAccount,
  signIn,
  signUpStudent,
  signUpTeacher,
  type PublicClass,
} from '@/lib/auth';
import { BASE_PATH } from '@/lib/site';

type Mode = 'login' | 'student' | 'teacher' | 'forgot';

const MODE_COPY: Record<Mode, { title: string; subtitle: string }> = {
  login: { title: '登录课程中心', subtitle: '使用跨界探索平台的账号进入，教师与学生共用同一套账号' },
  student: { title: '学生注册', subtitle: '填写学号与班级，注册后即可开始学习' },
  teacher: { title: '教师注册', subtitle: '校内教师填写工号与手机号，注册后由管理员分配工作室' },
  forgot: { title: '找回密码', subtitle: '课程中心暂不提供自助重置，请联系管理员处理' },
};

const STUDENT_NO = /^\d{14}$/;
const EMPLOYEE_NO = /^\d{8}$/;
const PHONE = /^1[3-9]\d{9}$/;
const PASSWORD = /^\S{6,20}$/;

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 登录
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 注册
  const [displayName, setDisplayName] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [phone, setPhone] = useState('');
  const [classId, setClassId] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const classesLoaded = useRef(false);

  useEffect(() => {
    const remembered = readRememberedAccount();
    if (remembered) {
      setIdentifier(remembered);
      setRemember(true);
    }
  }, []);

  // 进入学生注册时才拉班级，避免登录页多一次无用请求。
  // 注意：依赖里不能放 classesLoading，否则 setLoading 会触发自身重跑并 abort 请求。
  useEffect(() => {
    if (mode !== 'student' || classesLoaded.current) return;
    const controller = new AbortController();
    setClassesLoading(true);
    setClassesError('');
    fetchPublicClasses(controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        classesLoaded.current = true;
        setClasses(rows);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setClassesError('班级列表加载失败，请刷新重试或联系管理员');
      })
      .finally(() => {
        if (!controller.signal.aborted) setClassesLoading(false);
      });
    return () => controller.abort();
  }, [mode]);

  const classGroups = useMemo(() => {
    const groups = new Map<string, PublicClass[]>();
    for (const row of classes) {
      const key = `${row.grade} 级 · ${row.majorName}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [classes]);

  function resetFeedback() {
    setFormError('');
    setFieldErrors({});
    setNotice('');
  }

  function switchMode(next: Mode) {
    resetFeedback();
    setMode(next);
    setShowPassword(false);
  }

  function finishLogin(nextPath: string) {
    const raw = new URLSearchParams(window.location.search).get('next') ?? '';
    const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : nextPath;
    window.location.assign(safe);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    resetFeedback();

    const errors: Record<string, string> = {};
    if (!identifier.trim()) errors.identifier = '请输入学号 / 工号 / 手机号';
    if (!password) errors.password = '请输入密码';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await signIn(identifier.trim(), password);
      rememberAccount(identifier.trim(), remember);
      finishLogin(`${BASE_PATH}/`);
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
      } else {
        setFormError('登录失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStudentRegister(event: React.FormEvent) {
    event.preventDefault();
    resetFeedback();

    const errors: Record<string, string> = {};
    if (!displayName.trim()) errors.displayName = '请输入姓名';
    if (!STUDENT_NO.test(studentNo.trim())) errors.studentNo = '学号必须是 14 位数字';
    if (!PHONE.test(phone.trim())) errors.phone = '手机号格式不正确';
    if (!classId) errors.classId = '请选择班级';
    if (!PASSWORD.test(password)) errors.password = '密码为 6–20 位，且不能包含空格';
    if (password !== confirmPassword) errors.confirmPassword = '两次输入的密码不一致';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await signUpStudent({
        displayName: displayName.trim(),
        studentNo: studentNo.trim(),
        phone: phone.trim(),
        classId,
        password,
        confirmPassword,
      });
      setIdentifier(studentNo.trim());
      setPassword('');
      setConfirmPassword('');
      setNotice('注册成功，请用学号和密码登录');
      setMode('login');
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
      } else {
        setFormError('注册失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTeacherRegister(event: React.FormEvent) {
    event.preventDefault();
    resetFeedback();

    const errors: Record<string, string> = {};
    if (!displayName.trim()) errors.displayName = '请输入姓名';
    if (!EMPLOYEE_NO.test(employeeNo.trim())) errors.employeeNo = '工号必须是 8 位数字';
    if (!PHONE.test(phone.trim())) errors.phone = '手机号格式不正确';
    if (!PASSWORD.test(password)) errors.password = '密码为 6–20 位，且不能包含空格';
    if (password !== confirmPassword) errors.confirmPassword = '两次输入的密码不一致';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await signUpTeacher({
        displayName: displayName.trim(),
        employeeNo: employeeNo.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
      });
      setIdentifier(employeeNo.trim());
      setPassword('');
      setConfirmPassword('');
      setNotice('注册成功，请用工号和密码登录；工作室由管理员分配');
      setMode('login');
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors ?? {});
      } else {
        setFormError('注册失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const copy = MODE_COPY[mode];

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-[430px]">
        <div className="overflow-hidden rounded-[26px] border border-border/70 bg-card/85 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent px-8 py-6">
            <div className="flex items-center gap-2.5">
              <EurasiaMark className="h-6 w-auto shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-foreground/85">
                  SuperUnknown
                </p>
                <p className="mt-0.5 text-[10px] tracking-[0.14em] text-muted-foreground/70">
                  课程中心 · COURSE CENTER
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 pt-7">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{copy.subtitle}</p>

            {notice ? (
              <p className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.06] px-3.5 py-2.5 text-[12px] text-primary">
                {notice}
              </p>
            ) : null}

            {formError ? (
              <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3.5 py-2.5 text-[12px] text-destructive">
                {formError}
              </p>
            ) : null}

            {mode === 'login' ? (
              <form className="mt-5 space-y-4" onSubmit={handleLogin} noValidate>
                <Field label="账号" error={fieldErrors.identifier} htmlFor="identifier">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                    <input
                      id="identifier"
                      value={identifier}
                      onChange={(event) => {
                        setIdentifier(event.target.value);
                        setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                        setFormError('');
                      }}
                      placeholder="学号 / 工号 / 手机号"
                      autoComplete="username"
                      className={inputClass(Boolean(fieldErrors.identifier), 'pl-10')}
                    />
                  </div>
                </Field>

                <Field label="密码" error={fieldErrors.password} htmlFor="password">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                        setFormError('');
                      }}
                      placeholder="请输入密码"
                      autoComplete="current-password"
                      className={inputClass(Boolean(fieldErrors.password), 'pl-10 pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                <div className="flex items-center justify-between text-[12px]">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="size-3.5 rounded border-border accent-primary"
                    />
                    记住我
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    忘记密码？
                  </button>
                </div>

                <PrimaryButton submitting={submitting} label="进入课程中心" />
              </form>
            ) : null}

            {mode === 'student' ? (
              <form className="mt-5 space-y-4" onSubmit={handleStudentRegister} noValidate>
                <Field label="姓名" error={fieldErrors.displayName} htmlFor="student-name">
                  <input
                    id="student-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="真实姓名"
                    autoComplete="name"
                    className={inputClass(Boolean(fieldErrors.displayName))}
                  />
                </Field>

                <Field label="学号" error={fieldErrors.studentNo} htmlFor="student-no">
                  <input
                    id="student-no"
                    value={studentNo}
                    onChange={(event) => setStudentNo(event.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder="14 位学号"
                    inputMode="numeric"
                    className={inputClass(Boolean(fieldErrors.studentNo))}
                  />
                </Field>

                <Field label="手机号" error={fieldErrors.phone} htmlFor="student-phone">
                  <input
                    id="student-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="用于找回密码"
                    inputMode="tel"
                    className={inputClass(Boolean(fieldErrors.phone))}
                  />
                </Field>

                <Field label="班级" error={fieldErrors.classId || classesError} htmlFor="student-class">
                  <select
                    id="student-class"
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                    className={inputClass(Boolean(fieldErrors.classId))}
                    disabled={classesLoading}
                  >
                    <option value="">{classesLoading ? '加载中…' : '请选择班级'}</option>
                    {classGroups.map(([group, rows]) => (
                      <optgroup key={group} label={group}>
                        {rows.map((row) => (
                          <option key={row.id} value={String(row.id)}>
                            {row.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>

                <PasswordFields
                  password={password}
                  confirmPassword={confirmPassword}
                  onPassword={setPassword}
                  onConfirm={setConfirmPassword}
                  errors={fieldErrors}
                />

                <PrimaryButton submitting={submitting} label="注册学生账号" />
              </form>
            ) : null}

            {mode === 'teacher' ? (
              <form className="mt-5 space-y-4" onSubmit={handleTeacherRegister} noValidate>
                <Field label="姓名" error={fieldErrors.displayName} htmlFor="teacher-name">
                  <input
                    id="teacher-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="真实姓名"
                    autoComplete="name"
                    className={inputClass(Boolean(fieldErrors.displayName))}
                  />
                </Field>

                <Field label="工号" error={fieldErrors.employeeNo} htmlFor="teacher-no">
                  <input
                    id="teacher-no"
                    value={employeeNo}
                    onChange={(event) => setEmployeeNo(event.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="8 位工号"
                    inputMode="numeric"
                    className={inputClass(Boolean(fieldErrors.employeeNo))}
                  />
                </Field>

                <Field label="手机号" error={fieldErrors.phone} htmlFor="teacher-phone">
                  <input
                    id="teacher-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="用于找回密码"
                    inputMode="tel"
                    className={inputClass(Boolean(fieldErrors.phone))}
                  />
                </Field>

                <PasswordFields
                  password={password}
                  confirmPassword={confirmPassword}
                  onPassword={setPassword}
                  onConfirm={setConfirmPassword}
                  errors={fieldErrors}
                />

                <PrimaryButton submitting={submitting} label="注册教师账号" />
              </form>
            ) : null}

            {mode === 'forgot' ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-border/70 bg-secondary/40 px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
                  课程中心与跨界探索平台共用账号，暂不提供自助重置密码。
                  请联系所在工作室的负责教师或学院管理员，在后台重置后使用新密码登录。
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <ArrowLeft className="size-4" />
                  返回登录
                </button>
              </div>
            ) : null}

            {mode === 'login' ? (
              <div className="mt-6 flex items-center justify-center gap-1 text-[12px] text-muted-foreground">
                <span>还没有账号？</span>
                <button
                  type="button"
                  onClick={() => switchMode('student')}
                  className="font-medium text-primary transition-opacity hover:opacity-80"
                >
                  学生注册
                </button>
                <span className="mx-1 text-border">|</span>
                <button
                  type="button"
                  onClick={() => switchMode('teacher')}
                  className="font-medium text-primary transition-opacity hover:opacity-80"
                >
                  教师注册
                </button>
              </div>
            ) : mode !== 'forgot' ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mt-6 inline-flex w-full items-center justify-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                已有账号，返回登录
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-wide text-muted-foreground/60">
          西安欧亚学院 · SuperUnknown 软件工作室
        </p>
      </div>
    </main>
  );
}

/* ── 小组件 ─────────────────────────────────────────────── */

function inputClass(invalid: boolean, extra = '') {
  return [
    'h-11 w-full rounded-xl border bg-white px-3.5 text-[13px] text-foreground outline-none transition',
    'placeholder:text-muted-foreground/50',
    invalid
      ? 'border-destructive/60 focus:border-destructive focus:ring-4 focus:ring-destructive/10'
      : 'border-border/80 focus:border-primary focus:ring-4 focus:ring-primary/10',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[12px] font-medium text-foreground/80">
        {label}
      </label>
      {children}
      {error ? <p className="text-[11.5px] text-destructive">{error}</p> : null}
    </div>
  );
}

function PasswordFields({
  password,
  confirmPassword,
  onPassword,
  onConfirm,
  errors,
}: {
  password: string;
  confirmPassword: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <>
      <Field label="密码" error={errors.password} htmlFor="register-password">
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          placeholder="6–20 位，不含空格"
          autoComplete="new-password"
          className={inputClass(Boolean(errors.password))}
        />
      </Field>
      <Field label="确认密码" error={errors.confirmPassword} htmlFor="register-confirm">
        <input
          id="register-confirm"
          type="password"
          value={confirmPassword}
          onChange={(event) => onConfirm(event.target.value)}
          placeholder="再输入一次"
          autoComplete="new-password"
          className={inputClass(Boolean(errors.confirmPassword))}
        />
      </Field>
    </>
  );
}

function PrimaryButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {submitting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          处理中…
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="size-4" />
        </>
      )}
    </button>
  );
}
