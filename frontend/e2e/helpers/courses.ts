import { Page, expect } from '@playwright/test';

export class CoursesPOM {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/setup/courses');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.page.click('button:has-text("Add Course"), button:has-text("New Course"), [data-testid="add-course"]');
  }

  async fillForm(data: {
    courseCode?: string;
    courseTitle?: string;
    courseDescription?: string;
    lectureHoursPerWeek?: number;
    laboratoryHoursPerWeek?: number;
    creditUnits?: number;
    courseType?: string;
    departmentId?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    if (data.courseCode !== undefined) {
      await this.page.fill('input[name="courseCode"]', data.courseCode);
    }
    if (data.courseTitle !== undefined) {
      await this.page.fill('input[name="courseTitle"]', data.courseTitle);
    }
    if (data.courseDescription !== undefined) {
      await this.page.fill('textarea[name="courseDescription"]', data.courseDescription);
    }
    if (data.lectureHoursPerWeek !== undefined) {
      await this.page.fill('input[name="lectureHoursPerWeek"]', data.lectureHoursPerWeek.toString());
    }
    if (data.laboratoryHoursPerWeek !== undefined) {
      await this.page.fill('input[name="laboratoryHoursPerWeek"]', data.laboratoryHoursPerWeek.toString());
    }
    if (data.creditUnits !== undefined) {
      await this.page.fill('input[name="creditUnits"]', data.creditUnits.toString());
    }
    if (data.courseType !== undefined) {
      const select = this.page.locator('select[name="courseType"]');
      if (await select.count() > 0) {
        await select.selectOption(data.courseType);
      } else {
        const trigger = this.page.locator('[name="courseType"], [data-testid="course-type-select"]');
        await trigger.click();
        await this.page.click(`role=option[name="${data.courseType}"], [role="option"]:has-text("${data.courseType}")`);
      }
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
    courseCode: string;
    courseTitle: string;
    courseDescription?: string;
    lectureHoursPerWeek: number;
    laboratoryHoursPerWeek: number;
    creditUnits: number;
    courseType: string;
    departmentId: string;
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
    courseTitle?: string;
    courseDescription?: string;
    lectureHoursPerWeek?: number;
    laboratoryHoursPerWeek?: number;
    creditUnits?: number;
    courseType?: string;
    departmentId?: string;
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

  async nextPage() {
    await this.page.click('button:has-text("Next"), [data-testid="next-page"]');
    await this.page.waitForLoadState('networkidle');
  }

  async previousPage() {
    await this.page.click('button:has-text("Previous"), [data-testid="prev-page"]');
    await this.page.waitForLoadState('networkidle');
  }
}
