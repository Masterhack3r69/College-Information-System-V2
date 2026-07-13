import { Page, expect } from '@playwright/test';

export class ProgramsPOM {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/setup/programs');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.page.click('button:has-text("Add Program"), button:has-text("New Program"), [data-testid="add-program"]');
  }

  async fillForm(data: {
    programCode?: string;
    programName?: string;
    departmentId?: string; // value or label
    degreeType?: string;
    programDuration?: number;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    if (data.programCode !== undefined) {
      await this.page.fill('input[name="programCode"]', data.programCode);
    }
    if (data.programName !== undefined) {
      await this.page.fill('input[name="programName"]', data.programName);
    }
    if (data.departmentId !== undefined) {
      // Support select option by label/value or clicking shadcn UI custom select trigger
      const select = this.page.locator('select[name="departmentId"]');
      if (await select.count() > 0) {
        await select.selectOption(data.departmentId);
      } else {
        const trigger = this.page.locator('[name="departmentId"], [data-testid="department-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.departmentId}"], [role="option"]:has-text("${data.departmentId}")`);
      }
    }
    if (data.degreeType !== undefined) {
      const select = this.page.locator('select[name="degreeType"]');
      if (await select.count() > 0) {
        await select.selectOption(data.degreeType);
      } else {
        const trigger = this.page.locator('[name="degreeType"], [data-testid="degree-type-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.degreeType}"], [role="option"]:has-text("${data.degreeType}")`);
      }
    }
    if (data.programDuration !== undefined) {
      await this.page.fill('input[name="programDuration"]', data.programDuration.toString());
    }
    if (data.description !== undefined) {
      await this.page.fill('textarea[name="description"]', data.description);
    }
    if (data.status !== undefined) {
      const select = this.page.locator('select[name="status"]');
      if (await select.count() > 0) {
        await select.selectOption(data.status);
      }
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
  }

  async create(data: {
    programCode: string;
    programName: string;
    departmentId: string;
    degreeType: string;
    programDuration?: number;
    description?: string;
  }) {
    await this.openCreateModal();
    await this.fillForm(data);
    await this.submitForm();
  }

  async openEditModal(code: string) {
    const row = this.page.locator(`tr:has-text("${code}")`);
    await row.locator('button:has-text("Edit"), [data-testid="edit-btn"]').click();
  }

  async edit(code: string, data: {
    programName?: string;
    departmentId?: string;
    degreeType?: string;
    programDuration?: number;
    description?: string;
  }) {
    await this.openEditModal(code);
    await this.fillForm(data);
    await this.submitForm();
  }

  async search(query: string) {
    const searchInput = this.page.locator('input[placeholder*="Search"], input[name="search"], [data-testid="search-input"]');
    await searchInput.fill(query);
    await this.page.press('input', 'Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyRowExists(code: string, name: string) {
    const row = this.page.locator(`tr:has-text("${code}")`);
    await expect(row).toBeVisible();
    if (name) {
      await expect(row).toContainText(name);
    }
  }

  async verifyValidationError(fieldName: string, expectedMessage?: string) {
    const errorLocator = this.page.locator(`[name="${fieldName}"] ~ p, [data-testid="${fieldName}-error"], .text-destructive, .text-red-500`);
    if (expectedMessage) {
      await expect(errorLocator).toContainText(expectedMessage);
    } else {
      await expect(errorLocator).toBeVisible();
    }
  }
}
