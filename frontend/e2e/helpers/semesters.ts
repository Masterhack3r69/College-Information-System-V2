import { Page, expect } from '@playwright/test';

export class SemestersPOM {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/setup/semesters');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.page.click('button:has-text("Add Semester"), button:has-text("New Semester"), [data-testid="add-semester"]');
  }

  async fillForm(data: {
    name?: string;
    sortOrder?: number;
    active?: boolean;
  }) {
    if (data.name !== undefined) {
      const select = this.page.locator('select[name="name"]');
      if (await select.count() > 0) {
        await select.selectOption(data.name);
      } else {
        const input = this.page.locator('input[name="name"]');
        if (await input.count() > 0) {
          await input.fill(data.name);
        } else {
          // fallback custom select
          const trigger = this.page.locator('[name="name"], [data-testid="semester-name-select"]');
          await trigger.click();
          await this.page.click(`role=option[name="${data.name}"], [role="option"]:has-text("${data.name}")`);
        }
      }
    }
    if (data.sortOrder !== undefined) {
      await this.page.fill('input[name="sortOrder"]', data.sortOrder.toString());
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
    name: string;
    sortOrder: number;
    active: boolean;
  }) {
    await this.openCreateModal();
    await this.fillForm(data);
    await this.submitForm();
  }

  async openEditModal(name: string) {
    const row = this.page.locator(`tr:has-text("${name}")`);
    await row.locator('button:has-text("Edit"), [data-testid="edit-btn"]').click();
  }

  async edit(name: string, data: {
    sortOrder?: number;
    active?: boolean;
  }) {
    await this.openEditModal(name);
    await this.fillForm(data);
    await this.submitForm();
  }

  async verifyRowExists(name: string, sortOrderText?: string) {
    const row = this.page.locator(`tr:has-text("${name}")`);
    await expect(row).toBeVisible();
    if (sortOrderText) {
      await expect(row).toContainText(sortOrderText);
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
