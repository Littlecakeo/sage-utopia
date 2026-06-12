import { copyFile, mkdir } from 'node:fs/promises';

const staticFiles = [
  'brand-edit-fix.js',
  'career.js',
  'cloud-sync.js',
  'edit-mode.js',
  'finance.js',
  'growth.js',
  'portfolio.js',
  'resume.js',
  'sage-cloud-sync.js',
  'sage-data.js',
  'sage-sync.js',
  'sage-ui.js',
  'site-shell.js',
  'study.js',
  'tasks.js',
];

await mkdir('dist', { recursive: true });
await Promise.all(staticFiles.map(file => copyFile(file, `dist/${file}`)));

console.log('静态脚本已复制到 dist。');
