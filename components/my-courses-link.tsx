'use client';

import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { readAuthSession } from '@/lib/auth';
import { BASE_PATH } from '@/lib/site';

/** 登录后才显示的「我的课程」入口 */
export function MyCoursesLink({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(Boolean(readAuthSession()));
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  if (!visible) return null;

  return (
    <a href={`${BASE_PATH}/my/`} className={className}>
      <BookOpen className="size-3.5" />
      我的课程
    </a>
  );
}
