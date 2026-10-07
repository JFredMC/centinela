import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DeskStore } from './core/desk-store';
import { ThemeStore } from './core/theme.store';
import { UiStore, type MobileTab } from './core/ui.store';
import { AlertsComponent } from './features/alerts';
import { CaseDetailComponent } from './features/case-detail';
import { FeedComponent } from './features/feed';
import { KpisComponent } from './features/kpis';
import { PipelineComponent } from './features/pipeline';
import { RulesDrawerComponent } from './features/rules-drawer';
import { ScenariosComponent } from './features/scenarios';
import { ClockPipe } from './shared/pipes';

@Component({
  selector: 'app-root',
  imports: [
    AlertsComponent,
    CaseDetailComponent,
    ClockPipe,
    FeedComponent,
    KpisComponent,
    PipelineComponent,
    RulesDrawerComponent,
    ScenariosComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  protected readonly desk = inject(DeskStore);
  protected readonly ui = inject(UiStore);
  protected readonly theme = inject(ThemeStore);
  protected readonly running = computed(() => this.desk.state()?.running ?? false);
  protected readonly fast = computed(() => this.desk.state()?.speed === 'fast');
  protected readonly notice = computed(() => this.desk.state()?.notice?.text ?? '');
  protected readonly tabs: { id: MobileTab; label: string }[] = [
    { id: 'alerts', label: 'Alertas' },
    { id: 'feed', label: 'Movimientos' },
    { id: 'case', label: 'Caso' },
  ];

  reset(): void {
    if (confirm('¿Borrar los datos de la demo y empezar de cero?')) {
      this.ui.selectedId.set(null);
      this.desk.reset();
    }
  }
}
