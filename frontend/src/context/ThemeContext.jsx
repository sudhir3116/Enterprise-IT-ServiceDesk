import React, { createContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

// ── UTILITIES: COLOR CONVERSIONS & GENERATION ────────────────────────────

function isValidHex(hex) {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function applyBrandColor(hexColor, activeTheme) {
  if (!isValidHex(hexColor)) return;
  const rgb = hexToRgb(hexColor);
  if (!rgb) return;
  const { r, g, b } = rgb;
  
  const isHtmlDark = activeTheme === 'dark';
  
  // 1. Hover state generation (darken 15% in light, lighten 15% in dark)
  let hoverHex;
  if (isHtmlDark) {
    const hoverR = Math.floor(r + (255 - r) * 0.15);
    const hoverG = Math.floor(g + (255 - g) * 0.15);
    const hoverB = Math.floor(b + (255 - b) * 0.15);
    hoverHex = rgbToHex(hoverR, hoverG, hoverB);
  } else {
    const hoverR = Math.max(0, Math.floor(r * 0.85));
    const hoverG = Math.max(0, Math.floor(g * 0.85));
    const hoverB = Math.max(0, Math.floor(b * 0.85));
    hoverHex = rgbToHex(hoverR, hoverG, hoverB);
  }

  // 2. Light highlight background (blend 90% white in light, blend 12% brand on dark #080a0f)
  let lightR, lightG, lightB;
  if (isHtmlDark) {
    lightR = Math.floor(8 + (r - 8) * 0.12);
    lightG = Math.floor(10 + (g - 10) * 0.12);
    lightB = Math.floor(15 + (b - 15) * 0.12);
  } else {
    lightR = Math.floor(r + (255 - r) * 0.9);
    lightG = Math.floor(g + (255 - g) * 0.9);
    lightB = Math.floor(b + (255 - b) * 0.9);
  }
  const lightHex = rgbToHex(lightR, lightG, lightB);

  // 3. Subtle borders (blend 75% white in light, blend 22% brand on dark #080a0f)
  let borderR, borderG, borderB;
  if (isHtmlDark) {
    borderR = Math.floor(8 + (r - 8) * 0.22);
    borderG = Math.floor(10 + (g - 10) * 0.22);
    borderB = Math.floor(15 + (b - 15) * 0.22);
  } else {
    borderR = Math.floor(r + (255 - r) * 0.75);
    borderG = Math.floor(g + (255 - g) * 0.75);
    borderB = Math.floor(b + (255 - b) * 0.75);
  }
  const borderHex = rgbToHex(borderR, borderG, borderB);

  // 4. Focus Ring (40% brand color opacity)
  const ringCss = `rgba(${r}, ${g}, ${b}, 0.4)`;

  // 5. WCAG AA Contrast check (relative luminance)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const textHex = yiq >= 128 ? '#09090b' : '#ffffff';

  // Apply variables to document element styling root
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', hexColor);
  root.style.setProperty('--brand-primary-hover', hoverHex);
  root.style.setProperty('--brand-primary-light', lightHex);
  root.style.setProperty('--brand-primary-border', borderHex);
  root.style.setProperty('--brand-primary-ring', ringCss);
  root.style.setProperty('--brand-primary-text', textHex);
}

// ── PROVIDER EXPORT ──────────────────────────────────────────────────────

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });

  const [activeTheme, setActiveTheme] = useState('light');

  const [brandColor, setBrandColor] = useState(() => {
    return localStorage.getItem('brand-color') || '#2563eb';
  });

  // Handle dark mode class logic
  useEffect(() => {
    const root = window.document.documentElement;
    
    let resolvedTheme = themeMode;
    if (themeMode === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    setActiveTheme(resolvedTheme);
    localStorage.setItem('theme', themeMode);
  }, [themeMode]);

  // Apply brand colors when either the color or active theme shifts
  useEffect(() => {
    applyBrandColor(brandColor, activeTheme);
  }, [brandColor, activeTheme]);

  // System listener for system theme changes
  useEffect(() => {
    if (themeMode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const root = window.document.documentElement;
      const newResolvedTheme = e.matches ? 'dark' : 'light';
      
      if (newResolvedTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setActiveTheme(newResolvedTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (mode) => {
    if (['light', 'dark', 'system'].includes(mode)) {
      setThemeMode(mode);
    }
  };

  const updateBrandColor = (newColor) => {
    if (isValidHex(newColor)) {
      setBrandColor(newColor);
      localStorage.setItem('brand-color', newColor);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: activeTheme, 
      themeMode, 
      setThemeMode: setTheme, 
      toggleTheme, 
      isDark: activeTheme === 'dark',
      brandColor,
      updateBrandColor
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
