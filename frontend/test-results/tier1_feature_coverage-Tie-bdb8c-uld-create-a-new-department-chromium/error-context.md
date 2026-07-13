# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tier1_feature_coverage.spec.ts >> Tier 1: Feature Coverage (40 E2E tests) >> Departments Module >> 2. should create a new department
- Location: e2e\specs\tier1_feature_coverage.spec.ts:26:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/login", waiting until "load"

```

# Test source

```ts
  1  | import { Page, BrowserContext } from '@playwright/test';
  2  | import * as fs from 'fs';
  3  | import * as path from 'path';
  4  | import { fileURLToPath } from 'url';
  5  | 
  6  | const __filename = fileURLToPath(import.meta.url);
  7  | const __dirname = path.dirname(__filename);
  8  | 
  9  | export const AUTH_STATE_PATH = path.join(__dirname, '../../playwright/.auth/user.json');
  10 | 
  11 | export async function login(page: Page, username = 'admin', password = 'admin123') {
> 12 |   await page.goto('/login');
     |              ^ Error: page.goto: Test timeout of 30000ms exceeded.
  13 |   await page.fill('input[name="username"]', username);
  14 |   await page.fill('input[name="password"]', password);
  15 |   await page.click('button[type="submit"]');
  16 |   // Wait for login redirection (e.g., to enrollment page or overview page)
  17 |   await page.waitForURL(url => url.pathname.includes('/enrollment') || url.pathname === '/');
  18 | }
  19 | 
  20 | export async function setupAuthState(page: Page) {
  21 |   await login(page);
  22 |   // Ensure the directory exists
  23 |   const dir = path.dirname(AUTH_STATE_PATH);
  24 |   if (!fs.existsSync(dir)) {
  25 |     fs.mkdirSync(dir, { recursive: true });
  26 |   }
  27 |   await page.context().storageState({ path: AUTH_STATE_PATH });
  28 | }
  29 | 
  30 | export async function loadAuthState(context: BrowserContext) {
  31 |   if (fs.existsSync(AUTH_STATE_PATH)) {
  32 |     await context.addCookies(JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8')).cookies);
  33 |   }
  34 | }
  35 | 
```