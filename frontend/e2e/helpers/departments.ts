import { Page, expect } from '@playwright/test';

export class DepartmentsPOM {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/setup/departments');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.page.click('button:has-text("Add Department"), button:has-text("New Department"), [data-testid="add-department"]');
  }

  async fillForm(data: {
    departmentCode?: string;
    departmentName?: string;
    dean?: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    if (data.departmentCode !== undefined) {
      await this.page.fill('input[name="departmentCode"]', data.departmentCode);
    }
    if (data.departmentName !== undefined) {
      await this.page.fill('input[name="departmentName"]', data.departmentName);
    }
    if (data.dean !== undefined) {
      await this.page.fill('input[name="dean"]', data.dean);
    }
    if (data.description !== undefined) {
      await this.page.fill('textarea[name="description"]', data.description);
    }
    if (data.status !== undefined) {
      // Typically status is a switch, select or dropdown.
      // Let's assume a select or checkbox/switch name="status"
      const statusSelector = 'select[name="status"], [role="combobox"][name="status"]';
      if (await this.page.locator(statusSelector).count() > 0) {
        await this.page.selectOption('select[name="status"]', data.status);
      }
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
  }

  async create(data: {
    departmentCode: string;
    departmentName: string;
    dean?: string;
    description?: string;
  }) {
    await this.openCreateModal();
    await this.fillForm(data);
    await this.submitForm();
  }

  async openEditModal(code: string) {
    // Locate the row with the given code and click the Edit action button
    const row = this.page.locator(`tr:has-text("${code}")`);
    await row.locator('button:has-text("Edit"), [data-testid="edit-btn"]').click();
  }

  async edit(code: string, data: {
    departmentName?: string;
    dean?: string;
    description?: string;
  }) {
    await this.openEditModal(code);
    await this.fillForm(data);
    await this.submitForm();
  }

  async toggleStatus(code: string) {
    const row = this.page.locator(`tr:has-text("${code}")`);
    // Status can be updated via a status switch inside the row or custom PATCH trigger
    const toggle = row.locator('button[role="switch"], [data-testid="status-toggle"], input[type="checkbox"]');
    if (await toggle.count() > 0) {
      await toggle.first().click();
    } else {
      // Or edit modal and change status
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

  async nextPage() {
    await this.page.click('button:has-text("Next"), [data-testid="next-page"]');
    await this.page.waitForLoadState('networkidle');
  }

  async previousPage() {
    await this.page.click('button:has-text("Previous"), [data-testid="prev-page"]');
    await this.page.waitForLoadState('networkidle');
  }

  async verifyRowExists(code: string, name: string) {
    const row = this.page.locator(`tr:has-text("${code}")`);
    await expect(row).toBeVisible();
    if (name) {
      await expect(row).toContainText(name);
    }
  }

  async verifyRowDoesNotExist(code: string) {
    const row = this.page.locator(`tr:has-text("${code}")`);
    await expect(row).not.toBeVisible();
  }

  async verifyValidationError(fieldName: string, expectedMessage?: string) {
    // Find error message under/associated with field
    const errorLocator = this.page.locator(`[name="${fieldName}"] ~ p, [data-testid="${fieldName}-error"], .text-destructive, .text-red-500`);
    if (expectedMessage) {
      await expect(errorLocator).toContainText(expectedMessage);
    } else {
      await expect(errorLocator).toBeVisible();
    }
  }

  async verifyDuplicateError() {
    // Check for toast or alert indicating duplicate code/name or validation error
    const alert = this.page.locator('.toast, [role="alert"], text=already exists, text=Duplicate, text=unique constraint');
    await expect(alert.first()).toBeVisible();
  }
}
