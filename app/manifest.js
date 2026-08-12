// PWA manifest — gives the app a real name and icon when added to a phone's
// home screen. Next links this automatically as /manifest.webmanifest.
export default function manifest() {
  return {
    name: 'tāst · Smart Recipe Builder',
    short_name: 'tāst',
    description: 'Dial-in coffee brewing recipes from your beans and gear.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F6F3',
    theme_color: '#1A1716',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
