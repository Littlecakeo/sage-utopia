import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    appType: 'mpa',
    define: {
      __SAGE_SUPABASE_URL__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || ''),
      __SAGE_SUPABASE_ANON_KEY__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
      __SAGE_ADMIN_PASSCODE__: JSON.stringify(env.NEXT_PUBLIC_ADMIN_PASSCODE || ''),
    },
    build: {
      assetsDir: '',
      rollupOptions: {
        input: {
          index: 'index.html',
          study: 'study.html',
          career: 'career.html',
          resume: 'resume.html',
          about: 'about.html',
          friends: 'friends.html',
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name][extname]',
        },
      },
    },
  };
});
