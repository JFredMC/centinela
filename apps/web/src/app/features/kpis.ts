import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DeskStore } from '../core/desk-store';
import { CopPipe } from '../shared/pipes';

@Component({
  selector: 'app-kpis',
  imports: [CopPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let k = desk.kpis();
    <dl class="kpis" aria-label="Indicadores de la mesa">
      <div class="kpi">
        <dt>Procesados</dt>
        <dd data-testid="kpi-processed">{{ k.processed }}</dd>
      </div>
      <div class="kpi">
        <dt>Alertas abiertas</dt>
        <dd class="warn" data-testid="kpi-open">{{ k.open }}</dd>
      </div>
      <div class="kpi">
        <dt>Tasa de alerta</dt>
        <dd>{{ k.alertRate }}%</dd>
      </div>
      <div class="kpi">
        <dt>Latencia p95</dt>
        <dd>{{ k.p95 }} ms</dd>
      </div>
      <div class="kpi wide">
        <dt>Monto retenido</dt>
        <dd class="bad">{{ k.heldAmount | cop }}</dd>
      </div>
    </dl>
  `,
})
export class KpisComponent {
  protected readonly desk = inject(DeskStore);
}
