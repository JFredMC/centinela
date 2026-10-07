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

describe('Marca y tema', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: appConfig.providers,
    }).compileComponents();
  });

  it('firma JFredDev al portafolio en otra pestaña', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const a = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[data-testid="brand"]',
    );
    expect(a?.href).toBe('https://jfredmc.github.io/portfolio/');
    expect(a?.target).toBe('_blank');
    expect(a?.rel).toContain('noopener');
  });

  it('alterna tema claro/oscuro y lo recuerda', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="theme"]',
    );
    const start = document.documentElement.dataset['theme'];
    btn?.click();
    await fixture.whenStable();
    expect(document.documentElement.dataset['theme']).not.toBe(start);
    expect(localStorage.getItem('centinela:theme')).toBe(document.documentElement.dataset['theme']);
  });
});
