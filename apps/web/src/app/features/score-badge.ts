import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Decision } from '@centinela/fraud-engine';

@Component({
  selector: 'app-score',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'score',
    '[class]': '"score " + decision()',
    '[attr.aria-label]': '"Puntaje " + value()',
  },
  template: `<span class="bar" [style.width.%]="value()"></span><b>{{ value() }}</b>`,
})
export class ScoreComponent {
  readonly value = input.required<number>();
  readonly decision = input.required<Decision>();
}
