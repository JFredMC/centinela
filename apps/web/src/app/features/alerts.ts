import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DeskStore } from '../core/desk-store';
import { UiStore } from '../core/ui.store';
import { AgePipe, CopPipe, DecisionPipe, OriginPipe } from '../shared/pipes';
import { ScoreComponent } from './score-badge';

@Component({
  selector: 'app-alerts',
  imports: [AgePipe, CopPipe, DecisionPipe, OriginPipe, ScoreComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel list-panel" aria-labelledby="alerts-title">
      <header class="panel-head">
        <h2 id="alerts-title">
          Alertas <span class="count" data-testid="alerts-count">{{ open().length }}</span>
        </h2>
        <span class="muted small">Retenidas primero</span>
      </header>
      @if (open().length === 0) {
        <p class="empty">Sin alertas abiertas. Inyecta un caso para ver la mesa en acción.</p>
      }
      <ul class="rows" data-testid="alerts">
        @for (t of open(); track t.id) {
          <li>
            <button
              type="button"
              class="row alert"
              [class.selected]="ui.selected()?.id === t.id"
              [class.block]="t.decision === 'block'"
              (click)="ui.select(t.id)"
            >
              <span class="who">
                <strong>{{ t.customer }}</strong>
                <small>
                  <span class="tag" [class]="'tag ' + t.decision">{{ t.decision | decision }}</span>
                  @if (t.origin !== 'canal') {
                    {{ t.origin | origin }} ·
                  }
                  {{ t.hits.length }} reglas · {{ t.completedAt | age: ui.now() }}
                </small>
              </span>
              <span class="amount mono">{{ t.amount | cop }}</span>
              <app-score [value]="t.score" [decision]="t.decision" />
            </button>
          </li>
        }
      </ul>
    </section>
  `,
})
export class AlertsComponent {
  private readonly desk = inject(DeskStore);
  protected readonly ui = inject(UiStore);
  protected readonly open = computed(() =>
    [...this.desk.openAlerts()].sort(
      (a, b) =>
        Number(b.decision === 'block') - Number(a.decision === 'block') ||
        b.completedAt - a.completedAt,
    ),
  );
}
