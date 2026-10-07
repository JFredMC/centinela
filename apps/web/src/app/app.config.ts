import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { DemoDeskStore } from './core/demo-desk.store';
import { DeskStore } from './core/desk-store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: DeskStore, useClass: DemoDeskStore },
  ],
};
