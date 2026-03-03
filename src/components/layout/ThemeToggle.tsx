import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('nexus-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nexus-theme', next);
  };

  return (
    <button type="button" className="nav-item" onClick={toggle} style={{ cursor: 'pointer' }}>
      {theme === 'dark' ? <Sun className="icon" size={20} /> : <Moon className="icon" size={20} />}
      <span className="nav-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
}
