export const themeInitScript = `
  (function() {
    try {
      var theme = localStorage.getItem('visual-theme') || 'padrao';
      document.documentElement.setAttribute('data-tema', theme);
      if (theme === 'pulse') {
        document.documentElement.classList.add('dark');
      } else {
        // Maintain existing logic for standard dark mode if any
        // but for now, we just ensure data-tema is set.
      }
    } catch (e) {}
  })();
`;

export type VisualTheme = "padrao" | "pulse";

export function getStoredTheme(): VisualTheme {
  if (typeof window === 'undefined') return 'padrao';
  return (localStorage.getItem('visual-theme') as VisualTheme) || 'padrao';
}

export function setStoredTheme(theme: VisualTheme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('visual-theme', theme);
  document.documentElement.setAttribute('data-tema', theme);
  
  // The Pulse theme is a dark theme by nature
  if (theme === 'pulse') {
    document.documentElement.classList.add('dark');
  } else {
    // For 'padrao', we let the existing dark mode logic handle it
    // but typically it follows the 'dark' class.
  }
}
