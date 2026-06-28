import { copyFile, cp, mkdir } from 'node:fs/promises';

const staticFiles = [
  '.nojekyll',
  'portfolio.html',
  'brand-edit-fix.js',
  'career.js',
  'cloud-sync.css',
  'cloud-sync.js',
  'compact.css',
  'edit-mode.css',
  'edit-mode.js',
  'finance.js',
  'guestbook.css',
  'guestbook.js',
  'growth.js',
  'mobile-fix.css',
  'online-only.js',
  'portfolio.js',
  'progress.css',
  'resume.js',
  'sage-cloud-sync.js',
  'sage-data.js',
  'sage-sync.js',
  'sage-ui.js',
  'site-shell.js',
  'study.js',
  'style.css',
  'tasks.js',
  'theme-refresh.css',
];

await mkdir('dist', { recursive: true });
await Promise.all(staticFiles.map(file => copyFile(file, `dist/${file}`)));
await cp('assets', 'dist/assets', { recursive: true });

console.log('静态脚本已复制到 dist。');
