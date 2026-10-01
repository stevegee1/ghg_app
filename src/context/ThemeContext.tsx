import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Enterprise Google SaaS standard: enforce crisp daylight light mode across all screens
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ghg_theme');
      if (saved === 'dark') {
        localStorage.setItem('ghg_theme', 'light');
      }
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('ghg_theme', 'light');
  }, []);

  const toggleTheme = () => {
    // Standardized to Enterprise Light across all pages
    setThemeState('light');
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('ghg_theme', 'light');
  };

  const setTheme = (_newTheme: Theme) => {
    setThemeState('light');
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('ghg_theme', 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
