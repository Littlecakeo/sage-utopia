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
  'friends.html',
  'sage-cloud-data.js',
  'style.css',
  'mobile-fix.css',
  'theme-refresh.css',
  'edit-mode.js',
  'site-shell.js',
];

await Promise.all(requiredFiles.map((file) => access(file)));
await Promise.all([
  access('dist/index.html'),
  access('dist/sage-env.js'),
  access('dist/sage-cloud-data.js'),
]);

const index = await readFile('index.html', 'utf8');
const requiredAnchors = [
  'index.html',
  'study.html',
  'career.html',
  'finance.html',
  'growth.html',
  'friends.html',
  'resume.html',
];

for (const anchor of requiredAnchors) {
  if (!index.includes(anchor)) {
    throw new Error(`index.html 缺少关键页面入口：${anchor}`);
  }
}

const builtIndex = await readFile('dist/index.html', 'utf8');
if (/\/assets\/sage-cloud-data-[^"']+\.js/.test(builtIndex)) {
  throw new Error('dist/index.html 仍在引用 hash 版 sage-cloud-data，手机端更新时可能失效。');
}

const pagesWithCloud = [
  'dist/index.html',
  'dist/study.html',
  'dist/career.html',
  'dist/finance.html',
  'dist/growth.html',
  'dist/resume.html',
  'dist/friends.html',
  'dist/about.html',
];

for (const page of pagesWithCloud) {
  const html = await readFile(page, 'utf8');
  const envIndex = html.indexOf('sage-env.js');
  const cloudIndex = html.indexOf('sage-cloud-data.js');
  if (envIndex === -1 || cloudIndex === -1 || envIndex > cloudIndex) {
    throw new Error(`${page} 必须先加载 sage-env.js，再加载 sage-cloud-data.js。`);
  }
}

console.log('静态站点基础文件检查通过。');
