import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { DeskStore } from './core/desk-store';

describe('App (modo demo)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: appConfig.providers,
    }).compileComponents();
  });

  it('muestra la mesa con historia, KPIs y alertas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('CENTINELA');
    expect(el.querySelector('[data-testid="kpi-processed"]')?.textContent?.trim()).toBe('14');
    expect(el.querySelectorAll('[data-testid="feed"] li').length).toBe(14);
    expect(el.querySelectorAll('[data-testid="alerts"] li').length).toBeGreaterThan(0);
    expect(el.querySelector('[data-testid="case-score"]')).not.toBeNull();
  });

  it('inyectar un escenario llena la cola y avisa', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('[data-scenario="estructura"]')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(DeskStore).state()?.queue.length).toBeGreaterThanOrEqual(3);
    expect(el.querySelector('.notice')?.textContent).toContain('$10 millones');
  });

  it('resolver una alerta la saca de la lista', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const desk = TestBed.inject(DeskStore);
    const before = desk.openAlerts().length;
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.actions .btn.ok')?.click();
    await fixture.whenStable();
    expect(desk.openAlerts().length).toBe(before - 1);
    expect(el.querySelector('.resolved')?.textContent).toContain('Liberada');
  });

  it('abre el panel de reglas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('[data-testid="open-rules"]')?.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.rules li').length).toBe(10);
  });
});
