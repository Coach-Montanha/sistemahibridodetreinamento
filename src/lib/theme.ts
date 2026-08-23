import { useState, useEffect } from 'react';

export const themeInitScript = `
  (function() {
    try {
      var visualTheme = localStorage.getItem('visual-theme') || 'padrao';
      document.documentElement.setAttribute('data-tema', visualTheme);
      
      var theme = localStorage.getItem('theme') || 'system';
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (visualTheme === 'pulse' || isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
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
  
  const uiTheme = localStorage.getItem('theme') || 'system';
  const isDark = uiTheme === 'dark' || (uiTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (theme === 'pulse' || isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as any) || 'system';
  });

  const setTheme = (t: 'light' | 'dark' | 'system') => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    const visualTheme = getStoredTheme();
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (visualTheme === 'pulse' || isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { theme, setTheme };
}

