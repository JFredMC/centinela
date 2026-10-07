import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { MAX_WEIGHT, type RuleId } from '@centinela/fraud-engine';
import { DeskStore } from '../core/desk-store';
import { UiStore } from '../core/ui.store';

@Component({
  selector: 'app-rules-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'ui.rulesOpen.set(false)' },
  template: `
    @if (ui.rulesOpen()) {
      <div class="scrim" (click)="ui.rulesOpen.set(false)" aria-hidden="true"></div>
      <aside
        #drawer
        class="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        tabindex="-1"
      >
        <header class="panel-head">
          <h2 id="rules-title">Reglas y umbrales</h2>
          <button
            type="button"
            class="icon-btn"
            (click)="ui.rulesOpen.set(false)"
            aria-label="Cerrar"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <p class="muted small">
          El puntaje es la suma de los pesos (tope 100). Los cambios aplican a lo que entra después.
        </p>

        @if (policy(); as p) {
          <fieldset class="thresholds">
            <legend>Umbrales</legend>
            <label>
              <span
                >Revisión desde <b class="mono">{{ p.reviewAt }}</b></span
              >
              <input
                type="range"
                min="10"
                max="80"
                [value]="p.reviewAt"
                (input)="threshold('reviewAt', $event)"
              />
            </label>
            <label>
              <span
                >Bloqueo desde <b class="mono">{{ p.blockAt }}</b></span
              >
              <input
                type="range"
                min="15"
                max="100"
                [value]="p.blockAt"
                (input)="threshold('blockAt', $event)"
              />
            </label>
          </fieldset>

          <ul class="rules">
            @for (r of p.rules; track r.id) {
              <li [class.off]="!r.enabled">
                <div class="rule-head">
                  <label class="switch">
                    <input type="checkbox" [checked]="r.enabled" (change)="toggle(r.id, $event)" />
                    <span>{{ r.name }}</span>
                  </label>
                  <b class="mono">{{ r.weight }}</b>
                </div>
                <small class="muted">{{ r.blurb }}</small>
                <input
                  type="range"
                  min="0"
                  [max]="max"
                  [value]="r.weight"
                  [disabled]="!r.enabled"
                  [attr.aria-label]="'Peso de ' + r.name"
                  (input)="weight(r.id, $event)"
                />
              </li>
            }
          </ul>
        }
        <footer class="drawer-foot">
          <button type="button" class="btn" (click)="desk.dispatch({ type: 'resetPolicy' })">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>Valores de fábrica
          </button>
        </footer>
      </aside>
    }
  `,
})
export class RulesDrawerComponent {
  protected readonly desk = inject(DeskStore);
  protected readonly ui = inject(UiStore);
  protected readonly max = MAX_WEIGHT;
  protected readonly policy = computed(() => this.desk.state()?.policy ?? null);
  private readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');

  constructor() {
    effect(() => this.drawer()?.nativeElement.focus());
  }

  private num(e: Event): number {
    return Number((e.target as HTMLInputElement).value);
  }

  threshold(key: 'reviewAt' | 'blockAt', e: Event): void {
    this.desk.dispatch({ type: 'setThresholds', [key]: this.num(e) });
  }

  weight(id: RuleId, e: Event): void {
    this.desk.dispatch({ type: 'setRule', id, patch: { weight: this.num(e) } });
  }

  toggle(id: RuleId, e: Event): void {
    this.desk.dispatch({
      type: 'setRule',
      id,
      patch: { enabled: (e.target as HTMLInputElement).checked },
    });
  }
}
