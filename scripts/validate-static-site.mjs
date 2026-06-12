import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'index.html',
  'study.html',
  'career.html',
  'finance.html',
  'growth.html',
  'portfolio.html',
  'about.html',
  'resume.html',
  'sage-cloud-data.js',
  'style.css',
  'mobile-fix.css',
  'theme-refresh.css',
  'edit-mode.js',
  'site-shell.js',
];

await Promise.all(requiredFiles.map((file) => access(file)));

const index = await readFile('index.html', 'utf8');
const requiredAnchors = [
  'index.html',
  'study.html',
  'career.html',
  'finance.html',
  'growth.html',
  'portfolio.html',
  'resume.html',
];

for (const anchor of requiredAnchors) {
  if (!index.includes(anchor)) {
    throw new Error(`index.html 缺少关键页面入口：${anchor}`);
  }
}

console.log('静态站点基础文件检查通过。');
