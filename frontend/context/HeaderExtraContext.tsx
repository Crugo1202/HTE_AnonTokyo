import React, { createContext, useContext, useState, useCallback } from 'react';

interface HeaderExtraContextValue {
  overallScore: string | null;
  setOverallScore: (score: string | null) => void;
}

const HeaderExtraContext = createContext<HeaderExtraContextValue | null>(null);

export function HeaderExtraProvider({ children }: { children: React.ReactNode }) {
  const [overallScore, setOverallScoreState] = useState<string | null>(null);
  const setOverallScore = useCallback((score: string | null) => {
    setOverallScoreState(score);
  }, []);

  return (
    <HeaderExtraContext.Provider value={{ overallScore, setOverallScore }}>
      {children}
    </HeaderExtraContext.Provider>
  );
}

export function useHeaderExtra() {
  const ctx = useContext(HeaderExtraContext);
  if (!ctx) {
    throw new Error('useHeaderExtra must be used within HeaderExtraProvider');
  }
  return ctx;
}
