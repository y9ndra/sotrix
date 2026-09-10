import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('sotrix_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('sotrix_theme', newTheme);
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new CustomEvent('sotrix_theme_change', { detail: newTheme }));
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    const currentTheme =
      typeof document !== 'undefined'
        ? (document.documentElement.getAttribute('data-theme') as Theme) || 'dark'
        : 'dark';
    return {
      theme: currentTheme,
      setTheme: (t: Theme) => {
        try {
          localStorage.setItem('sotrix_theme', t);
        } catch (e) {}
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', t);
        }
      },
      toggleTheme: () => {
        const next = currentTheme === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem('sotrix_theme', next);
        } catch (e) {}
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', next);
        }
      },
    };
  }
  return context;
};
