import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'midnight' | 'pearl' | 'ocean' | 'forest' | 'slate' | 'contrast' | 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = (localStorage.getItem('signbridge_theme') || localStorage.getItem('sb_theme')) as ThemeMode;
    if (saved && ['midnight', 'pearl', 'ocean', 'forest', 'slate', 'contrast', 'dark', 'light'].includes(saved)) {
      return saved;
    }
    return 'pearl';
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove previous theme classes
    root.classList.remove('theme-midnight', 'theme-pearl', 'theme-ocean', 'theme-forest', 'theme-slate', 'theme-contrast', 'dark', 'light');

    if (theme === 'pearl' || theme === 'light') {
      root.classList.add('light', 'theme-pearl');
      root.style.colorScheme = 'light';
    } else if (theme === 'ocean') {
      root.classList.add('dark', 'theme-ocean');
      root.style.colorScheme = 'dark';
    } else if (theme === 'slate') {
      root.classList.add('light', 'theme-slate');
      root.style.colorScheme = 'light';
    } else if (theme === 'forest') {
      root.classList.add('dark', 'theme-forest');
      root.style.colorScheme = 'dark';
    } else if (theme === 'contrast') {
      root.classList.add('dark', 'theme-contrast');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('dark', 'theme-midnight');
      root.style.colorScheme = 'dark';
    }

    localStorage.setItem('signbridge_theme', theme);
    localStorage.setItem('sb_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => setThemeState(newTheme);
  const toggleTheme = () => {
    setThemeState(current => {
      if (current === 'pearl' || current === 'light') return 'midnight';
      return 'pearl';
    });
  };

  const resolvedTheme: 'dark' | 'light' = (theme === 'pearl' || theme === 'light') ? 'light' : 'dark';

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
