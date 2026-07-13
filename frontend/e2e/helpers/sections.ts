import { Page, expect } from '@playwright/test';

export class SectionsPOM {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/setup/sections');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.page.click('button:has-text("Add Section"), button:has-text("New Section"), [data-testid="add-section"]');
  }

  async fillForm(data: {
    sectionCode?: string;
    programId?: string;
    schoolYearId?: string;
    semesterId?: string;
    yearLevel?: number;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    if (data.sectionCode !== undefined) {
      await this.page.fill('input[name="sectionCode"]', data.sectionCode);
    }
    if (data.programId !== undefined) {
      const select = this.page.locator('select[name="programId"]');
      if (await select.count() > 0) {
        await select.selectOption(data.programId);
      } else {
        const trigger = this.page.locator('[name="programId"], [data-testid="program-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.programId}"], [role="option"]:has-text("${data.programId}")`);
      }
    }
    if (data.schoolYearId !== undefined) {
      const select = this.page.locator('select[name="schoolYearId"]');
      if (await select.count() > 0) {
        await select.selectOption(data.schoolYearId);
      } else {
        const trigger = this.page.locator('[name="schoolYearId"], [data-testid="school-year-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.schoolYearId}"], [role="option"]:has-text("${data.schoolYearId}")`);
      }
    }
    if (data.semesterId !== undefined) {
      const select = this.page.locator('select[name="semesterId"]');
      if (await select.count() > 0) {
        await select.selectOption(data.semesterId);
      } else {
        const trigger = this.page.locator('[name="semesterId"], [data-testid="semester-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.semesterId}"], [role="option"]:has-text("${data.semesterId}")`);
      }
    }
    if (data.yearLevel !== undefined) {
      await this.page.fill('input[name="yearLevel"]', data.yearLevel.toString());
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
    sectionCode: string;
    programId: string;
    schoolYearId: string;
    semesterId: string;
    yearLevel: number;
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
    programId?: string;
    schoolYearId?: string;
    semesterId?: string;
    yearLevel?: number;
  }) {
    await this.openEditModal(code);
    await this.fillForm(data);
    await this.submitForm();
  }

  async toggleStatus(code: string) {
    const row = this.page.locator(`tr:has-text("${code}")`);
    const toggle = row.locator('button[role="switch"], [data-testid="status-toggle"], input[type="checkbox"]');
    if (await toggle.count() > 0) {
      await toggle.first().click();
    } else {
      await this.openEditModal(code);
      const select = this.page.locator('select[name="status"]');
      const current = await select.inputValue();
      const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await select.selectOption(next);
      await this.submitForm();
    }
  }

  async search(query: string) {
    const searchInput = this.page.locator('input[placeholder*="Search"], input[name="search"], [data-testid="search-input"]');
    await searchInput.fill(query);
    await this.page.press('input', 'Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyRowExists(code: string, programText?: string) {
    const row = this.page.locator(`tr:has-text("${code}")`);
    await expect(row).toBeVisible();
    if (programText) {
      await expect(row).toContainText(programText);
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
