import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { AnalystAction } from '@centinela/fraud-engine';
import { DeskStore } from '../core/desk-store';
import { UiStore } from '../core/ui.store';
import {
  AnalystPipe,
  ChannelPipe,
  ClockPipe,
  CopPipe,
  DecisionPipe,
  OriginPipe,
  PanPipe,
} from '../shared/pipes';

@Component({
  selector: 'app-case-detail',
  imports: [AnalystPipe, ChannelPipe, ClockPipe, CopPipe, DecisionPipe, OriginPipe, PanPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel case" aria-labelledby="case-title" data-testid="case">
      @if (ui.selected(); as t) {
        <header class="case-head">
          <div>
            <p class="muted small mono">{{ t.id }} · {{ t.ts | clock }}</p>
            <h2 id="case-title">{{ t.customer }}</h2>
            <p class="muted small">{{ t.segment }} · {{ t.customerId | pan }}</p>
          </div>
          <div class="gauge" [class]="'gauge ' + t.decision" [style.--v]="t.score">
            <strong data-testid="case-score">{{ t.score }}</strong>
            <span>{{ t.decision | decision }}</span>
          </div>
        </header>

        <dl class="facts">
          <div>
            <dt>Monto</dt>
            <dd class="mono">{{ t.amount | cop }}</dd>
          </div>
          <div>
            <dt>Canal</dt>
            <dd>{{ t.channel | channel }}{{ t.cardPresent ? '' : ' · sin tarjeta' }}</dd>
          </div>
          <div>
            <dt>Comercio</dt>
            <dd>
              {{ t.merchant }} <small class="muted">MCC {{ t.mcc }}</small>
            </dd>
          </div>
          <div>
            <dt>Ubicación</dt>
            <dd>{{ t.city }}, {{ t.country }}</dd>
          </div>
          <div>
            <dt>Dispositivo</dt>
            <dd>{{ t.device }}</dd>
          </div>
          <div>
            <dt>Latencia</dt>
            <dd class="mono">{{ t.latencyMs }} ms</dd>
          </div>
          @if (t.origin !== 'canal') {
            <div>
              <dt>Patrón</dt>
              <dd>{{ t.origin | origin }}</dd>
            </div>
          }
        </dl>

        <h3>Reglas que dispararon</h3>
        @if (t.hits.length === 0) {
          <p class="empty">Ninguna. El movimiento pasó limpio.</p>
        } @else {
          <ul class="hits">
            @for (h of t.hits; track h.id) {
              <li>
                <span class="weight mono">+{{ h.weight }}</span>
                <span
                  ><strong>{{ h.name }}</strong
                  ><small>{{ h.evidence }}</small></span
                >
              </li>
            }
          </ul>
        }

        @if (t.analyst === 'open') {
          <div class="actions" role="group" aria-label="Decisión del analista">
            <button type="button" class="btn ok" (click)="act(t.id, 'released')">
              <i class="bi bi-check2-circle" aria-hidden="true"></i>Liberar
            </button>
            <button type="button" class="btn bad" (click)="act(t.id, 'confirmed')">
              <i class="bi bi-slash-circle" aria-hidden="true"></i>Confirmar bloqueo
            </button>
            <button type="button" class="btn" (click)="act(t.id, 'escalated')">
              <i class="bi bi-arrow-up-right-circle" aria-hidden="true"></i>Escalar
            </button>
          </div>
        } @else if (t.analyst !== 'none') {
          <p class="resolved" role="status">
            <i class="bi bi-check2" aria-hidden="true"></i> {{ t.analyst | analyst }}
          </p>
        }
      } @else {
        <p class="empty">Selecciona un movimiento o una alerta.</p>
      }
    </section>
  `,
})
export class CaseDetailComponent {
  private readonly desk = inject(DeskStore);
  protected readonly ui = inject(UiStore);

  act(id: string, action: AnalystAction): void {
    // Mantiene el caso en pantalla para ver la resolución.
    this.ui.selectedId.set(id);
    this.desk.dispatch({ type: 'resolve', id, action });
  }
}
