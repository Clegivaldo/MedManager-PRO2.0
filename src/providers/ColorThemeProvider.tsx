import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ColorTheme = "zinc" | "blue" | "green" | "orange";

type ColorThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ColorTheme;
  storageKey?: string;
};

type ColorThemeProviderState = {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
};

const initialState: ColorThemeProviderState = {
  theme: 'zinc',
  setTheme: () => null,
};

const ColorThemeContext = createContext<ColorThemeProviderState>(initialState);

export function ColorThemeProvider({
  children,
  defaultTheme = 'zinc',
  storageKey = 'vite-ui-color-theme',
  ...props
}: ColorThemeProviderProps) {
  const [theme, setTheme] = useState<ColorTheme>(
    () => (localStorage.getItem(storageKey) as ColorTheme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("theme-zinc", "theme-blue", "theme-green", "theme-orange");
    root.classList.add(`theme-${theme}`);
    
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: ColorTheme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <ColorThemeContext.Provider {...props} value={value}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeContext);

  if (context === undefined)
    throw new Error('useColorTheme must be used within a ColorThemeProvider');

  return context;
};
