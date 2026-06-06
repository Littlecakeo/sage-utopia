module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run serve',
      startServerReadyPattern: 'Available on:',
      url: ['http://127.0.0.1:4173/index.html', 'http://127.0.0.1:4173/index.html#study'],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.6 }],
        'categories:accessibility': ['warn', { minScore: 0.75 }],
        'categories:best-practices': ['warn', { minScore: 0.75 }],
        'categories:seo': ['warn', { minScore: 0.75 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
