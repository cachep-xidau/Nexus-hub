import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('nexus-theme') as 'light' | 'dark' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nexus-theme', next);
  };

  return (
    <button className="nav-item" onClick={toggle} style={{ cursor: 'pointer' }}>
      {theme === 'dark' ? <Sun className="icon" size={20} /> : <Moon className="icon" size={20} />}
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
