(function () {
  'use strict';

  if (location.protocol !== 'file:') return;

  var pages = [
    'index.html',
    'study.html',
    'career.html',
    'finance.html',
    'growth.html',
    'friends.html',
    'resume.html',
    'about.html',
    'portfolio.html',
  ];
  var file = (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '');
  var page = pages.indexOf(file) >= 0 ? file : 'index.html';
  var hash = location.hash || '';

  // Drop query strings on purpose so names, usernames, and passwords are never
  // carried from a local file URL into the online site.
  location.replace('https://sage-utopia.vercel.app/' + page + hash);
})();
