"use client";

import { createContext, useContext } from "react";

type DateContextType = {
  selectedDate: string; // "YYYY-MM-DD"
  setSelectedDate: (d: string) => void;
};

export const DateContext = createContext<DateContextType | null>(null);

export function useDateContext(): DateContextType {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error("useDateContext must be inside DateContext.Provider");
  return ctx;
}
