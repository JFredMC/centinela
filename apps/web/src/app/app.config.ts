import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { environment } from '../environments/environment';
import { ApiDeskStore } from './core/api-desk.store';
import { DemoDeskStore } from './core/demo-desk.store';
import { DeskStore } from './core/desk-store';
import { API_URL, resolveMode } from './core/mode';

const mode = resolveMode(
  environment.apiUrl,
  typeof localStorage === 'undefined' ? undefined : localStorage,
  typeof location === 'undefined' ? '' : location.search,
);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: API_URL, useValue: environment.apiUrl },
    { provide: DeskStore, useClass: mode === 'api' ? ApiDeskStore : DemoDeskStore },
  ],
};
