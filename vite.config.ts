import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    appType: 'mpa',
    define: {
      __SAGE_SUPABASE_URL__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || ''),
      __SAGE_SUPABASE_ANON_KEY__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
    },
    build: {
      rollupOptions: {
        input: {
          index: 'index.html',
          study: 'study.html',
          career: 'career.html',
          finance: 'finance.html',
          growth: 'growth.html',
          resume: 'resume.html',
          portfolio: 'portfolio.html',
          about: 'about.html',
        },
      },
    },
  };
});
