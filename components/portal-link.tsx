'use client';

import { useEffect, useState } from 'react';
import { PORTAL_LABEL, PORTAL_URL } from '@/lib/site';
import { readAuthSession } from '@/lib/auth';

const ROLE_HOME: Record<string, string> = {
  student: '/student/home',
  teacher: '/teacher/home',
  admin: '/admin/home',
};

/**
 * 顶栏/页脚的「跨界探索平台」入口。
 *
 * 跨界平台的根路径 `/` 会无条件跳到 `/login`（通配路由），所以这里按当前角色
 * 指到对应的首页；未登录时退化为登录页。配置了外部地址时按外链处理。
 */
export function PortalLink({ className }: { className?: string }) {
  const external = /^https?:/i.test(PORTAL_URL);
  const [target, setTarget] = useState(external ? PORTAL_URL : '/login');

  useEffect(() => {
    if (external) return;
    const session = readAuthSession();
    setTarget(ROLE_HOME[session?.user.role ?? ''] ?? '/login');
  }, [external]);

  return (
    <a
      href={target}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={className}
    >
      {PORTAL_LABEL}
    </a>
  );
}
