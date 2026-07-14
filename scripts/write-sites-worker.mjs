import { mkdir, writeFile } from 'node:fs/promises';

const worker = `/** Serve the validated static Sage Utopia build through Sites. */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
`;

await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/index.js', worker, 'utf8');
console.log('Sites 静态资源入口已生成：dist/server/index.js');
