import { expect, test, type Page } from '@playwright/test';

const ready = async (page: Page) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'CENTINELA' })).toBeVisible();
  await expect(page.getByTestId('kpi-processed')).not.toHaveText('0');
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e')) {
      localStorage.clear();
      sessionStorage.setItem('e2e', '1');
    }
  });
});

test('carga la mesa en modo demo con marca, OG y sin errores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await expect(page).toHaveTitle(/CENTINELA/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /centinela\/og\.jpg$/,
  );
  const brand = page.getByTestId('brand');
  await expect(brand).toHaveAttribute('href', 'https://jfredmc.github.io/portfolio/');
  await expect(brand).toHaveAttribute('target', '_blank');
  await expect(page.getByText('Demo', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('el worker procesa tráfico en vivo', async ({ page }) => {
  await ready(page);
  const start = Number(await page.getByTestId('kpi-processed').textContent());
  await expect
    .poll(async () => Number(await page.getByTestId('kpi-processed').textContent()), {
      timeout: 15_000,
    })
    .toBeGreaterThan(start);
});

test('viaje imposible: alerta retenida con regla geo y el analista la confirma', async ({
  page,
  isMobile,
}) => {
  await ready(page);
  await page.locator('[data-scenario="viaje"]').click();
  await expect(page.locator('.notice')).toContainText('Viaje imposible');
  const alert = page
    .getByTestId('alerts')
    .getByRole('button', { name: /Camila Restrepo/ })
    .first();
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert).toContainText('Retenida');
  await alert.click();
  if (isMobile)
    await expect(page.getByRole('tab', { name: 'Caso' })).toHaveAttribute('aria-selected', 'true');
  const kase = page.getByTestId('case');
  await expect(kase).toContainText('Geo imposible');
  await expect(kase).toContainText('Miami');
  await kase.getByRole('button', { name: 'Confirmar bloqueo' }).click();
  await expect(kase).toContainText('Bloqueo confirmado');
});

test('las reglas se guardan en localStorage y sobreviven a la recarga', async ({ page }) => {
  await ready(page);
  await page.getByTestId('open-rules').click();
  const dialog = page.getByRole('dialog', { name: 'Reglas y umbrales' });
  await expect(dialog).toBeVisible();
  const geo = dialog.getByRole('checkbox', { name: 'Geo imposible' });
  await geo.uncheck();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.waitForTimeout(1700);
  await page.reload();
  await page.getByTestId('open-rules').click();
  await expect(
    page.getByRole('dialog').getByRole('checkbox', { name: 'Geo imposible' }),
  ).not.toBeChecked();
});

test('pausa la ingesta', async ({ page }) => {
  await ready(page);
  await page.getByTestId('toggle-run').click();
  await expect(page.getByText('Ingesta en pausa')).toBeVisible();
  await page.getByTestId('toggle-run').click();
  await expect(page.getByText('Canal en vivo')).toBeVisible();
});

test('tema claro/oscuro', async ({ page }) => {
  await ready(page);
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.getByTestId('theme').click();
  await expect(html).not.toHaveAttribute('data-theme', before ?? '');
});

test('rutas desconocidas caen en la app (404.html)', async ({ page }) => {
  await page.goto('./no-existe');
  await expect(page.getByRole('heading', { name: 'CENTINELA' })).toBeVisible();
});
