import { InjectionToken } from '@angular/core';
import type { DeskMode } from './desk-store';

export const MODE_KEY = 'centinela:mode';
export const API_URL = new InjectionToken<string | null>('API_URL');

/**
 * Elige la fuente de la mesa. Sin URL de API siempre es demo. Con API: `?mode=api|demo`
 * manda y se recuerda; si no, lo último elegido; por defecto demo.
 */
export function resolveMode(
  apiUrl: string | null,
  storage: Storage | undefined,
  search: string,
): DeskMode {
  if (!apiUrl) return 'demo';
  const q = new URLSearchParams(search).get('mode');
  if (q === 'api' || q === 'demo') {
    try {
      storage?.setItem(MODE_KEY, q);
    } catch {
      /* ignore */
    }
    return q;
  }
  try {
    return storage?.getItem(MODE_KEY) === 'api' ? 'api' : 'demo';
  } catch {
    return 'demo';
  }
}

export function switchMode(mode: DeskMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
  const url = new URL(location.href);
  url.searchParams.delete('mode');
  location.assign(url.toString());
}
