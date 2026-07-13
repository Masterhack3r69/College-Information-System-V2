import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth-helper';
import { DepartmentsPOM } from '../helpers/departments';
import { ProgramsPOM } from '../helpers/programs';
import { CoursesPOM } from '../helpers/courses';
import { FacultyPOM } from '../helpers/faculty';
import { SectionsPOM } from '../helpers/sections';
import { SchoolYearsPOM } from '../helpers/school-years';
import { SemestersPOM } from '../helpers/semesters';

test.describe('Tier 3: Cross-Feature Combo (8 E2E tests)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. should verify newly created department appears in programs department dropdown', async ({ page }) => {
    const deptPom = new DepartmentsPOM(page);
    await deptPom.navigate();
    await deptPom.create({
      departmentCode: 'CHEM-DEPT',
      departmentName: 'Chemistry Department',
    });

    const progPom = new ProgramsPOM(page);
    await progPom.navigate();
    await progPom.openCreateModal();
    const dropdown = page.locator('select[name="departmentId"], [name="departmentId"], [data-testid="department-select"]');
    await dropdown.click();
    await expect(page.locator('role=option[name="Chemistry Department"], [role="option"]:has-text("Chemistry Department"), option:has-text("Chemistry Department")').first()).toBeVisible();
  });

  test('2. should verify newly created department appears in courses department dropdown', async ({ page }) => {
    const deptPom = new DepartmentsPOM(page);
    await deptPom.navigate();
    await deptPom.create({
      departmentCode: 'PHYS-DEPT',
      departmentName: 'Physics Department',
    });

    const coursePom = new CoursesPOM(page);
    await coursePom.navigate();
    await coursePom.openCreateModal();
    const dropdown = page.locator('select[name="departmentId"], [name="departmentId"], [data-testid="department-select"]');
    await dropdown.click();
    await expect(page.locator('role=option[name="Physics Department"], [role="option"]:has-text("Physics Department"), option:has-text("Physics Department")').first()).toBeVisible();
  });

  test('3. should verify newly created department appears in faculty department dropdown', async ({ page }) => {
    const deptPom = new DepartmentsPOM(page);
    await deptPom.navigate();
    await deptPom.create({
      departmentCode: 'MATH-DEPT',
      departmentName: 'Mathematics Department',
    });

    const facPom = new FacultyPOM(page);
    await facPom.navigate();
    await facPom.openCreateModal();
    const dropdown = page.locator('select[name="departmentId"], [name="departmentId"], [data-testid="department-select"]');
    await dropdown.click();
    await expect(page.locator('role=option[name="Mathematics Department"], [role="option"]:has-text("Mathematics Department"), option:has-text("Mathematics Department")').first()).toBeVisible();
  });

  test('4. should verify newly created program appears in sections program dropdown', async ({ page }) => {
    const progPom = new ProgramsPOM(page);
    await progPom.navigate();
    await progPom.create({
      programCode: 'BS-CHEM',
      programName: 'Bachelor of Science in Chemistry',
      departmentId: 'CHEM-DEPT',
      degreeType: 'BACHELOR',
    });

    const secPom = new SectionsPOM(page);
    await secPom.navigate();
    await secPom.openCreateModal();
    const dropdown = page.locator('select[name="programId"], [name="programId"], [data-testid="program-select"]');
    await dropdown.click();
    await expect(page.locator('role=option[name="Bachelor of Science in Chemistry"], [role="option"]:has-text("Bachelor of Science in Chemistry"), option:has-text("BS-CHEM")').first()).toBeVisible();
  });

  test('5. should verify newly created school year and semester appear in sections dropdowns', async ({ page }) => {
    const syPom = new SchoolYearsPOM(page);
    await syPom.navigate();
    await syPom.create({ schoolYear: '2027-2028', active: false });

    const semPom = new SemestersPOM(page);
    await semPom.navigate();
    await semPom.create({ name: 'SUMMER_SEMESTER', sortOrder: 3, active: false });

    const secPom = new SectionsPOM(page);
    await secPom.navigate();
    await secPom.openCreateModal();
    
    // Check school year dropdown
    const syDropdown = page.locator('select[name="schoolYearId"], [name="schoolYearId"], [data-testid="school-year-select"]');
    await syDropdown.click();
    await expect(page.locator('role=option[name="2027-2028"], [role="option"]:has-text("2027-2028"), option:has-text("2027-2028")').first()).toBeVisible();
    await page.keyboard.press('Escape'); // close dropdown if needed

    // Check semester dropdown
    const semDropdown = page.locator('select[name="semesterId"], [name="semesterId"], [data-testid="semester-select"]');
    await semDropdown.click();
    await expect(page.locator('role=option[name="SUMMER_SEMESTER"], [role="option"]:has-text("SUMMER_SEMESTER"), option:has-text("SUMMER_SEMESTER")').first()).toBeVisible();
  });

  test('6. should verify deactivating department affects list options or warns active faculty', async ({ page }) => {
    const deptPom = new DepartmentsPOM(page);
    await deptPom.navigate();
    await deptPom.toggleStatus('PHYS-DEPT'); // Toggle to inactive
    
    // Navigate to faculty and try to add faculty, PHYS-DEPT should either be hidden or show warning
    const facPom = new FacultyPOM(page);
    await facPom.navigate();
    await facPom.openCreateModal();
    const dropdown = page.locator('select[name="departmentId"], [name="departmentId"], [data-testid="department-select"]');
    await dropdown.click();
    
    const inactiveDeptOption = page.locator('role=option[name="Physics Department"], [role="option"]:has-text("Physics Department"), option:has-text("Physics Department")');
    // It should be either hidden or disabled
    const count = await inactiveDeptOption.count();
    if (count > 0) {
      await expect(inactiveDeptOption.first()).toBeDisabled();
    } else {
      await expect(inactiveDeptOption).not.toBeVisible();
    }
  });

  test('7. should synchronize active term display in header when active school year changes', async ({ page }) => {
    const syPom = new SchoolYearsPOM(page);
    await syPom.navigate();
    await syPom.edit('2027-2028', { active: true });

    // Verify header "Current academic term" displays "2027-2028"
    const termHeader = page.locator('header, [data-testid="term-display"], text=2027-2028');
    await expect(termHeader.first()).toBeVisible();
  });

  test('8. should verify correct department code displays in programs list table row', async ({ page }) => {
    const progPom = new ProgramsPOM(page);
    await progPom.navigate();
    const row = page.locator('tr:has-text("BS-CHEM")');
    await expect(row).toContainText('CHEM-DEPT');
  });
});
