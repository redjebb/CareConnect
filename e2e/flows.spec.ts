import { expect, Page, test } from '@playwright/test';

const PASSWORD = 'Demo12345!';

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/');
  await page.getByPlaceholder('name@company.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Влез в системата/ }).click();
}

test('anonymous visitors are sent to the login page', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('button', { name: /Влез в системата/ })).toBeVisible();
  await page.goto('/driver/view');
  await expect(page.getByRole('button', { name: /Влез в системата/ })).toBeVisible();
});

test('wrong password shows a friendly error', async ({ page }) => {
  await login(page, 'manager@demo.bg', 'not-the-password');
  await expect(page.getByText('Грешен имейл или парола.')).toBeVisible();
});

test('manager sees the schedule with access notes and the analytics tab', async ({ page }) => {
  await login(page, 'manager@demo.bg');
  await expect(page).toHaveURL(/admin\/dashboard/);
  await expect(page.getByText('Стоян Димитров').first()).toBeVisible();
  await expect(page.getByText(/вратата (е )?вдясно/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Аналитика' }).click();
  await expect(page.getByRole('heading', { name: 'Аналитика' })).toBeVisible();
  await expect(page.getByText(/Пропуснати посещения/)).toBeVisible();
});

test('manager cannot reach the managers section (master only)', async ({ page }) => {
  await login(page, 'manager@demo.bg');
  await expect(page.getByRole('button', { name: 'Мениджъри' })).toHaveCount(0);
});

test('master administrator sees the managers section', async ({ page }) => {
  await login(page, 'master@demo.bg');
  await expect(page.getByRole('button', { name: 'Мениджъри' })).toBeVisible();
});

test('driver sees only own route, with the access note', async ({ page }) => {
  await login(page, 'driver@demo.bg');
  await expect(page).toHaveURL(/driver\/view/);
  await expect(page.getByText('Здравей, Иван Петров')).toBeVisible();
  await page.getByRole('button', { name: /ЗАПОЧНИ СМЯНА/ }).click();
  await expect(page.getByText('Стоян Димитров')).toBeVisible();
  await expect(page.getByText(/Достъп:/i).first()).toBeVisible();
  // The other driver's client must never be visible.
  await expect(page.getByText('Надя Христова')).toHaveCount(0);
});

test('a driver cannot open the admin dashboard', async ({ page }) => {
  await login(page, 'driver@demo.bg');
  await expect(page).toHaveURL(/driver\/view/);
  await page.goto('/admin/dashboard');
  // Either the access-denied screen or a redirect back to the driver view; never the admin panel.
  await expect(page.getByText(/Достъпът е ограничен|Здравей, Иван Петров/)).toBeVisible();
  await expect(page.getByText('Админ Панел')).toHaveCount(0);
});
