# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tier1_feature_coverage.spec.ts >> Tier 1: Feature Coverage (40 E2E tests) >> Departments Module >> 4. should toggle status of department
- Location: e2e\specs\tier1_feature_coverage.spec.ts:48:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="username"]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - main [ref=e3]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "Student information, handled with clarity." [level=1] [ref=e10]
      - paragraph [ref=e11]: A focused workspace for registrar enrollment, academic records, and official documents.
    - generic [ref=e13]:
      - heading "Welcome back" [level=2] [ref=e14]
      - paragraph [ref=e15]: Sign in to the college SIS workspace.
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Username or email
          - textbox "Username or email" [ref=e19]:
            - /placeholder: registrar
        - generic [ref=e20]:
          - generic [ref=e21]: Password
          - textbox "Password" [ref=e22]
        - button "Sign in" [ref=e23] [cursor=pointer]
      - paragraph [ref=e24]: Authorized school personnel only
  - region "Notifications alt+T"
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
  12 |   await page.goto('/login');
> 13 |   await page.fill('input[name="username"]', username);
     |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
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