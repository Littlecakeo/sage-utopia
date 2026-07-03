import { mkdir, writeFile } from 'node:fs/promises';

const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  NEXT_PUBLIC_ADMIN_PASSCODE: process.env.NEXT_PUBLIC_ADMIN_PASSCODE || '',
};

await mkdir('dist', { recursive: true });
await writeFile(
  'dist/sage-env.js',
  `window.__SAGE_ENV__ = Object.assign({}, ${JSON.stringify(env, null, 2)}, window.__SAGE_ENV__ || {});\n`,
  'utf8',
);

console.log('运行时环境文件已生成：dist/sage-env.js');
