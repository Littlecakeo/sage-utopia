import { readFile, writeFile } from 'node:fs/promises';

const pages = [
  'dist/index.html',
  'dist/study.html',
  'dist/career.html',
  'dist/resume.html',
  'dist/about.html',
  'dist/friends.html',
];

for (const page of pages) {
  let html = await readFile(page, 'utf8');
  html = html.replace(/\s*<script src="\/?sage-env\.js"><\/script>/g, '');
  html = html.replace(
    /(<script type="module"[^>]+src="\/sage-cloud-data\.js"><\/script>)/,
    '  <script src="/sage-env.js"></script>\n  $1',
  );
  await writeFile(page, html, 'utf8');
}

console.log('构建后的 HTML 加载顺序已修正。');
