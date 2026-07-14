import { cp, mkdir, readdir } from 'node:fs/promises';

await mkdir('dist/client', { recursive: true });

for (const entry of await readdir('dist')) {
  if (entry === 'server' || entry === 'client') continue;
  await cp(`dist/${entry}`, `dist/client/${entry}`, { recursive: true });
}

console.log('Sites 静态资源目录已生成：dist/client');
