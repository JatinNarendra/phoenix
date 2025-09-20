"use client";
import { useWebApp as useWebAppContext } from "../context/WebAppContext";

export const useWebApp = (_isMounted: boolean) => {
  return useWebAppContext();
};
