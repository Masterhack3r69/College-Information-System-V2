import { Page, expect } from '@playwright/test';

export class RoomsPOM {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/setup/rooms');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    await this.page.click('button:has-text("Add Room"), button:has-text("New Room"), [data-testid="add-room"]');
  }

  async fillForm(data: {
    roomCode?: string;
    roomName?: string;
    capacity?: number;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    if (data.roomCode !== undefined) {
      await this.page.fill('input[name="roomCode"]', data.roomCode);
    }
    if (data.roomName !== undefined) {
      await this.page.fill('input[name="roomName"]', data.roomName);
    }
    if (data.capacity !== undefined) {
      await this.page.fill('input[name="capacity"]', data.capacity.toString());
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
    roomCode: string;
    roomName: string;
    capacity?: number;
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
    roomName?: string;
    capacity?: number;
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
