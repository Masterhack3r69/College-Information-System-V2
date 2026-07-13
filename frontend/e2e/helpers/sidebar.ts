import { Page } from '@playwright/test';

export class SidebarPOM {
  constructor(private page: Page) {}

  async goToOverview() {
    await this.page.click('a[href="/"]');
  }

  async goToStudents() {
    await this.page.click('a[href="/students"]');
  }

  async goToEnrollment() {
    await this.page.click('a[href="/enrollment"]');
  }

  async goToSchedules() {
    await this.page.click('a[href="/schedules"]');
  }

  async goToGrades() {
    await this.page.click('a[href="/grades"]');
  }

  async goToReports() {
    await this.page.click('a[href="/reports"]');
  }

  async goToSetup() {
    // Navigates to `/setup` path (Academic Setup)
    // Wait for the link to be clickable
    const setupLink = this.page.locator('a[href*="/setup"]');
    await setupLink.click();
  }

  async signOut() {
    await this.page.click('text=Sign out');
  }
}
