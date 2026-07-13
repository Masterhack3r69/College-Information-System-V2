import { Page, expect } from '@playwright/test';

export class FacultyPOM {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/setup/faculty');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.page.click('button:has-text("Add Faculty"), button:has-text("New Faculty"), [data-testid="add-faculty"]');
  }

  async fillForm(data: {
    employeeNumber?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    email?: string;
    contactNumber?: string;
    departmentId?: string;
    employmentStatus?: string;
    facultyType?: string;
    specialization?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    if (data.employeeNumber !== undefined) {
      await this.page.fill('input[name="employeeNumber"]', data.employeeNumber);
    }
    if (data.firstName !== undefined) {
      await this.page.fill('input[name="firstName"]', data.firstName);
    }
    if (data.middleName !== undefined) {
      await this.page.fill('input[name="middleName"]', data.middleName);
    }
    if (data.lastName !== undefined) {
      await this.page.fill('input[name="lastName"]', data.lastName);
    }
    if (data.suffix !== undefined) {
      await this.page.fill('input[name="suffix"]', data.suffix);
    }
    if (data.email !== undefined) {
      await this.page.fill('input[name="email"]', data.email);
    }
    if (data.contactNumber !== undefined) {
      await this.page.fill('input[name="contactNumber"]', data.contactNumber);
    }
    if (data.departmentId !== undefined) {
      const select = this.page.locator('select[name="departmentId"]');
      if (await select.count() > 0) {
        await select.selectOption(data.departmentId);
      } else {
        const trigger = this.page.locator('[name="departmentId"], [data-testid="department-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.departmentId}"], [role="option"]:has-text("${data.departmentId}")`);
      }
    }
    if (data.employmentStatus !== undefined) {
      const select = this.page.locator('select[name="employmentStatus"]');
      if (await select.count() > 0) {
        await select.selectOption(data.employmentStatus);
      } else {
        const trigger = this.page.locator('[name="employmentStatus"], [data-testid="employment-status-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.employmentStatus}"], [role="option"]:has-text("${data.employmentStatus}")`);
      }
    }
    if (data.facultyType !== undefined) {
      const select = this.page.locator('select[name="facultyType"]');
      if (await select.count() > 0) {
        await select.selectOption(data.facultyType);
      } else {
        const trigger = this.page.locator('[name="facultyType"], [data-testid="faculty-type-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.facultyType}"], [role="option"]:has-text("${data.facultyType}")`);
      }
    }
    if (data.specialization !== undefined) {
      await this.page.fill('textarea[name="specialization"]', data.specialization);
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
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    employmentStatus: string;
    facultyType: string;
  }) {
    await this.openCreateModal();
    await this.fillForm(data);
    await this.submitForm();
  }

  async openEditModal(empNum: string) {
    const row = this.page.locator(`tr:has-text("${empNum}")`);
    await row.locator('button:has-text("Edit"), [data-testid="edit-btn"]').click();
  }

  async edit(empNum: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    departmentId?: string;
    employmentStatus?: string;
    facultyType?: string;
    specialization?: string;
  }) {
    await this.openEditModal(empNum);
    await this.fillForm(data);
    await this.submitForm();
  }

  async toggleStatus(empNum: string) {
    const row = this.page.locator(`tr:has-text("${empNum}")`);
    const toggle = row.locator('button[role="switch"], [data-testid="status-toggle"], input[type="checkbox"]');
    if (await toggle.count() > 0) {
      await toggle.first().click();
    } else {
      await this.openEditModal(empNum);
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

  async verifyRowExists(empNum: string, name: string) {
    const row = this.page.locator(`tr:has-text("${empNum}")`);
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
