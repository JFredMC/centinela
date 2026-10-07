import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { STAGES } from '@centinela/fraud-engine';
import { DeskStore } from '../core/desk-store';

@Component({
  selector: 'app-pipeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel pipeline" aria-label="Pipeline de procesamiento">
      <div class="queue" title="Movimientos esperando en la cola">
        <span class="label">Cola</span>
        <strong data-testid="queue-depth">{{ depth() }}</strong>
      </div>
      <ol class="stages">
        @for (st of stages; track st.id; let i = $index) {
          <li [class.active]="current() === st.id" [class.done]="doneIdx() > i">
            <span class="dot" aria-hidden="true"></span>
            <span>{{ st.label }}</span>
          </li>
        }
      </ol>
      <div class="in-flight" aria-live="off">
        @if (processing(); as p) {
          <span class="mono">{{ p.txn.id }}</span> · {{ p.txn.customer }}
        } @else {
          <span class="muted">Worker libre</span>
        }
      </div>
    </section>
  `,
})
export class PipelineComponent {
  private readonly desk = inject(DeskStore);
  protected readonly stages = STAGES;
  protected readonly processing = computed(() => this.desk.state()?.processing ?? null);
  protected readonly current = computed(() => this.processing()?.stage ?? null);
  protected readonly doneIdx = computed(() => STAGES.findIndex((s) => s.id === this.current()));
  protected readonly depth = computed(() => this.desk.state()?.queue.length ?? 0);
}
