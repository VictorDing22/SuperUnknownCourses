'use client';

import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { readAuthSession } from '@/lib/auth';

/** 教师才显示的「课程管理」入口；学生和未登录用户不渲染 */
export function ManageLink({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(readAuthSession()?.user.role === 'teacher');
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  if (!visible) return null;

  return (
    <a href="/manage/" className={className}>
      <Settings2 className="size-3.5" />
      课程管理
    </a>
  );
}
