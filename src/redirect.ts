if (import.meta.env.PROD) {
  const https = 'https:';
  if (window.location.protocol !== https) {
    window.location.protocol = https;
  }
}
const pathname = window.location.pathname;
if (pathname !== '/' && !pathname.endsWith('/')) {
  const paths = pathname.split('/');
  paths.pop();
  paths.push('');
  window.location.pathname = paths.join('/');
}
