import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SCENARIOS, type ScenarioKind } from '@centinela/fraud-engine';
import { DeskStore } from '../core/desk-store';
import { UiStore } from '../core/ui.store';

@Component({
  selector: 'app-scenarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scenarios" role="group" aria-label="Inyectar caso de fraude">
      <span class="label">Inyectar caso</span>
      @for (s of scenarios; track s.kind) {
        <button type="button" class="chip" (click)="run(s.kind)" [attr.data-scenario]="s.kind">
          <i class="bi bi-lightning-charge" aria-hidden="true"></i>{{ s.label }}
        </button>
      }
    </div>
  `,
})
export class ScenariosComponent {
  private readonly desk = inject(DeskStore);
  private readonly ui = inject(UiStore);
  protected readonly scenarios = SCENARIOS;

  run(kind: ScenarioKind): void {
    this.desk.dispatch({ type: 'inject', kind });
    this.ui.selectedId.set(null);
    this.ui.tab.set('alerts');
  }
}
