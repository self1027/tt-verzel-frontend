/* global localStorage, document, window */
// Resolve the theme before styles and React load to avoid an incorrect first paint.
let savedTheme
try {
  savedTheme = localStorage.getItem('verzel-theme')
} catch {
  // Storage may be disabled; system preference still works.
}
document.documentElement.dataset.theme =
  savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
