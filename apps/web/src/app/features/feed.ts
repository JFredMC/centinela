import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DeskStore } from '../core/desk-store';
import { UiStore } from '../core/ui.store';
import { ChannelPipe, ClockPipe, CopPipe, DecisionPipe } from '../shared/pipes';
import { ScoreComponent } from './score-badge';
import { ScoreTrendComponent } from './score-trend';

@Component({
  selector: 'app-feed',
  imports: [CopPipe, ClockPipe, ChannelPipe, DecisionPipe, ScoreComponent, ScoreTrendComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel list-panel" aria-labelledby="feed-title">
      <header class="panel-head">
        <h2 id="feed-title">Movimientos</h2>
        <app-score-trend />
      </header>
      <ul class="rows" data-testid="feed">
        @for (t of rows(); track t.id) {
          <li>
            <button
              type="button"
              class="row"
              [class.selected]="ui.selected()?.id === t.id"
              (click)="ui.select(t.id)"
              [attr.aria-label]="
                t.customer + ', ' + (t.amount | cop) + ', ' + (t.decision | decision)
              "
            >
              <span class="when mono">{{ t.ts | clock }}</span>
              <span class="who">
                <strong>{{ t.customer }}</strong>
                <small>{{ t.merchant }} · {{ t.channel | channel }} · {{ t.city }}</small>
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
export class FeedComponent {
  private readonly desk = inject(DeskStore);
  protected readonly ui = inject(UiStore);
  protected readonly rows = computed(() => this.desk.feed().slice(0, 60));
}
