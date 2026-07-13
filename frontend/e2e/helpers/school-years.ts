import { Page, expect } from '@playwright/test';

export class SchoolYearsPOM {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/setup/school-years');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.page.click('button:has-text("Add School Year"), button:has-text("New School Year"), [data-testid="add-school-year"]');
  }

  async fillForm(data: {
    schoolYear?: string;
    active?: boolean;
  }) {
    if (data.schoolYear !== undefined) {
      await this.page.fill('input[name="schoolYear"]', data.schoolYear);
    }
    if (data.active !== undefined) {
      const checkbox = this.page.locator('input[name="active"], button[role="switch"][name="active"], [data-testid="active-switch"]');
      const isChecked = await checkbox.isChecked();
      if (isChecked !== data.active) {
        await checkbox.click();
      }
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
  }

  async create(data: {
    schoolYear: string;
    active: boolean;
  }) {
    await this.openCreateModal();
    await this.fillForm(data);
    await this.submitForm();
  }

  async openEditModal(year: string) {
    const row = this.page.locator(`tr:has-text("${year}")`);
    await row.locator('button:has-text("Edit"), [data-testid="edit-btn"]').click();
  }

  async edit(year: string, data: {
    active?: boolean;
  }) {
    await this.openEditModal(year);
    await this.fillForm(data);
    await this.submitForm();
  }

  async verifyRowExists(year: string, activeText?: string) {
    const row = this.page.locator(`tr:has-text("${year}")`);
    await expect(row).toBeVisible();
    if (activeText) {
      await expect(row).toContainText(activeText);
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
