import { Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUTH_STATE_PATH = path.join(__dirname, '../../playwright/.auth/user.json');

export async function login(page: Page, username = 'admin', password = 'admin123') {
  await page.goto('/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for login redirection (e.g., to enrollment page or overview page)
  await page.waitForURL(url => url.pathname.includes('/enrollment') || url.pathname === '/');
}

export async function setupAuthState(page: Page) {
  await login(page);
  // Ensure the directory exists
  const dir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await page.context().storageState({ path: AUTH_STATE_PATH });
}

export async function loadAuthState(context: BrowserContext) {
  if (fs.existsSync(AUTH_STATE_PATH)) {
    await context.addCookies(JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8')).cookies);
  }
}
