'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface HelpModeContextValue {
  isHelpMode: boolean;
  toggleHelpMode: () => void;
}

const HelpModeContext = createContext<HelpModeContextValue>({ isHelpMode: false, toggleHelpMode: () => {} });

export function HelpModeProvider({ children }: { children: ReactNode }) {
  const [isHelpMode, setIsHelpMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('helpMode') === 'true';
  });

  function toggleHelpMode() {
    setIsHelpMode((prev) => {
      const next = !prev;
      localStorage.setItem('helpMode', String(next));
      return next;
    });
  }

  return <HelpModeContext.Provider value={{ isHelpMode, toggleHelpMode }}>{children}</HelpModeContext.Provider>;
}

export function useHelpMode() { return useContext(HelpModeContext); }
