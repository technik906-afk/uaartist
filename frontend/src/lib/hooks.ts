"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * false при SSR/гидрации, true в браузере.
 * Через useSyncExternalStore — без setState в эффекте
 * (react-hooks/set-state-in-effect в React 19 такое запрещает).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/** Значение из sessionStorage (null при SSR). */
export function useSessionValue(key: string): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem(key),
    () => null
  );
}
