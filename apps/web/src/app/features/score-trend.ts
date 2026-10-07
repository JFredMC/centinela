import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DeskStore } from '../core/desk-store';

const W = 160;
const H = 32;

@Component({
  selector: 'app-score-trend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="trend"
      [attr.viewBox]="'0 0 ' + w + ' ' + h"
      role="img"
      aria-label="Tendencia del puntaje en los últimos movimientos"
    >
      <line
        [attr.x1]="0"
        [attr.x2]="w"
        [attr.y1]="y(review())"
        [attr.y2]="y(review())"
        class="th review"
      />
      <line
        [attr.x1]="0"
        [attr.x2]="w"
        [attr.y1]="y(block())"
        [attr.y2]="y(block())"
        class="th block"
      />
      <polyline [attr.points]="points()" />
    </svg>
  `,
})
export class ScoreTrendComponent {
  private readonly desk = inject(DeskStore);
  protected readonly w = W;
  protected readonly h = H;
  protected readonly review = computed(() => this.desk.state()?.policy.reviewAt ?? 40);
  protected readonly block = computed(() => this.desk.state()?.policy.blockAt ?? 72);
  protected readonly points = computed(() => {
    const s = this.desk
      .feed()
      .slice(0, 40)
      .map((t) => t.score)
      .reverse();
    if (s.length < 2) return '';
    return s
      .map((v, i) => `${((i / (s.length - 1)) * W).toFixed(1)},${this.y(v).toFixed(1)}`)
      .join(' ');
  });

  protected y(score: number): number {
    return H - 2 - (score / 100) * (H - 4);
  }
}
