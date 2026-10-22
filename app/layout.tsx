import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'SuperUnknown 课程广场 · 西安欧亚学院',
    template: '%s · SuperUnknown 课程广场',
  },
  description:
    '西安欧亚学院 SuperUnknown 工作室课程广场：把工作室的互动课程，装进一个随时能打开的页面。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
