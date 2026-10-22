#!/usr/bin/env node
/**
 * 生成课程清单 public/courses/index.json。
 *
 * 供跨界探索平台的「课程管理」页读取（同源 fetch，无需后端）。
 * 在 dev / build 之前自动执行（见 package.json 的 pre* 脚本）。
 *
 * 资源地址会带上 NEXT_PUBLIC_BASE_PATH 前缀（校园版是 /plaza），
 * 这样清单里的 cover / entry 可以直接被使用，不用调用方再拼。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'courses');
const TARGET = path.join(ROOT, 'public', 'courses', 'index.json');
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const withBase = (p) => (p && p.startsWith('/') ? `${BASE}${p}` : p);

function readCourses() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const raw = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, name), 'utf8'));
      const slug = raw.slug;
      const scenes = Array.isArray(raw.chapters) ? raw.chapters.length : 0;
      return {
        slug,
        title: raw.title,
        subtitle: raw.subtitle ?? '',
        description: raw.description ?? '',
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        level: raw.level ?? '',
        duration: raw.duration ?? '',
        author: raw.author ?? '',
        updatedAt: raw.updatedAt ?? '',
        cover: withBase(raw.cover),
        stats: raw.stats ?? { scenes, slides: 0, interactive: 0, quizzes: 0 },
        chapterCount: scenes,
        entry: withBase(`/courses/${slug}/learn/`),
        detail: withBase(`/courses/${slug}/`),
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const catalog = readCourses();
fs.mkdirSync(path.dirname(TARGET), { recursive: true });
fs.writeFileSync(TARGET, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

console.log(
  `✓ 课程清单已生成：${path.relative(ROOT, TARGET)}（${catalog.length} 门课程${
    BASE ? `，前缀 ${BASE}` : ''
  }）`,
);
