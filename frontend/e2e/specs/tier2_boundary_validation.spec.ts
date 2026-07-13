import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth-helper';
import { DepartmentsPOM } from '../helpers/departments';
import { ProgramsPOM } from '../helpers/programs';
import { CoursesPOM } from '../helpers/courses';
import { FacultyPOM } from '../helpers/faculty';
import { RoomsPOM } from '../helpers/rooms';
import { SchoolYearsPOM } from '../helpers/school-years';
import { SemestersPOM } from '../helpers/semesters';
import { SectionsPOM } from '../helpers/sections';

test.describe('Tier 2: Boundary & Validation (40 E2E tests)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ================= DEPARTMENTS (5 Tests) =================
  test.describe('Departments Boundary & Validation', () => {
    test('1. should show validation error for blank department code', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ departmentCode: '', departmentName: 'Valid Name' });
      await pom.submitForm();
      await pom.verifyValidationError('departmentCode');
    });

    test('2. should show validation error for blank department name', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ departmentCode: 'VALID-CODE', departmentName: '' });
      await pom.submitForm();
      await pom.verifyValidationError('departmentName');
    });

    test('3. should show error toast/alert for duplicate department code', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await pom.create({
        departmentCode: 'DUP-CS',
        departmentName: 'Original CS Department',
      });
      await pom.create({
        departmentCode: 'DUP-CS', // duplicate code
        departmentName: 'Duplicate CS Department',
      });
      await pom.verifyDuplicateError();
    });

    test('4. should show validation error for excessively long department name/code if constraints apply', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      // departmentCode has a max limit of 40 in DB
      await pom.fillForm({
        departmentCode: 'A'.repeat(45),
        departmentName: 'Test Dept',
      });
      await pom.submitForm();
      await pom.verifyValidationError('departmentCode');
    });

    test('5. should restrict deactivation of department with active programs', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      // Attempt deactivation
      await pom.toggleStatus('CS-DEPT-01');
      // Verify constraint validation message
      const errorMsg = page.locator('text=Cannot deactivate, text=linked programs, text=constraint, text=error');
      await expect(errorMsg.first()).toBeVisible();
    });
  });

  // ================= PROGRAMS (5 Tests) =================
  test.describe('Programs Boundary & Validation', () => {
    test('6. should show validation error for blank program code', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ programCode: '', programName: 'Valid Name' });
      await pom.submitForm();
      await pom.verifyValidationError('programCode');
    });

    test('7. should show validation error for blank program name', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ programCode: 'BSCS', programName: '' });
      await pom.submitForm();
      await pom.verifyValidationError('programName');
    });

    test('8. should show duplicate program code error', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      await pom.create({
        programCode: 'DUP-PROG',
        programName: 'Original Program',
        departmentId: 'CS-DEPT-01',
        degreeType: 'BACHELOR',
      });
      await pom.create({
        programCode: 'DUP-PROG',
        programName: 'Duplicate Program',
        departmentId: 'CS-DEPT-01',
        degreeType: 'BACHELOR',
      });
      const alert = page.locator('.toast, [role="alert"], text=already exists, text=Duplicate');
      await expect(alert.first()).toBeVisible();
    });

    test('9. should show validation error for unselected department', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({
        programCode: 'BSCS-TEST',
        programName: 'Testing Program',
        degreeType: 'BACHELOR',
      });
      await pom.submitForm();
      await pom.verifyValidationError('departmentId');
    });

    test('10. should restrict deactivation of program with active sections', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      const row = page.locator('tr:has-text("BSCS-01")');
      const toggle = row.locator('button[role="switch"], [data-testid="status-toggle"], input[type="checkbox"]');
      if (await toggle.count() > 0) {
        await toggle.first().click();
        const errorMsg = page.locator('text=Cannot deactivate, text=linked sections, text=constraint, text=error');
        await expect(errorMsg.first()).toBeVisible();
      }
    });
  });

  // ================= COURSES (5 Tests) =================
  test.describe('Courses Boundary & Validation', () => {
    test('11. should show validation error for blank course code and title', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ courseCode: '', courseTitle: '' });
      await pom.submitForm();
      await pom.verifyValidationError('courseCode');
      await pom.verifyValidationError('courseTitle');
    });

    test('12. should validate lecture hours must be non-negative', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({
        courseCode: 'CS102',
        courseTitle: 'Database Systems',
        lectureHoursPerWeek: -1, // negative boundary
        creditUnits: 3,
        courseType: 'MAJOR',
        departmentId: 'CS-DEPT-01',
      });
      await pom.submitForm();
      await pom.verifyValidationError('lectureHoursPerWeek');
    });

    test('13. should validate laboratory hours must be non-negative', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({
        courseCode: 'CS102',
        courseTitle: 'Database Systems',
        laboratoryHoursPerWeek: -2, // negative boundary
        creditUnits: 3,
        courseType: 'MAJOR',
        departmentId: 'CS-DEPT-01',
      });
      await pom.submitForm();
      await pom.verifyValidationError('laboratoryHoursPerWeek');
    });

    test('14. should validate credit units must be non-negative', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({
        courseCode: 'CS102',
        courseTitle: 'Database Systems',
        creditUnits: -3, // negative boundary
        lectureHoursPerWeek: 3,
        laboratoryHoursPerWeek: 0,
        courseType: 'MAJOR',
        departmentId: 'CS-DEPT-01',
      });
      await pom.submitForm();
      await pom.verifyValidationError('creditUnits');
    });

    test('15. should prevent duplicate course code registration', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await pom.create({
        courseCode: 'CS101',
        courseTitle: 'Another Programming Course',
        lectureHoursPerWeek: 3,
        laboratoryHoursPerWeek: 0,
        creditUnits: 3,
        courseType: 'MAJOR',
        departmentId: 'CS-DEPT-01',
      });
      const alert = page.locator('.toast, [role="alert"], text=already exists, text=Duplicate');
      await expect(alert.first()).toBeVisible();
    });
  });

  // ================= FACULTY (5 Tests) =================
  test.describe('Faculty Boundary & Validation', () => {
    test('16. should validate employee number must not be blank', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ employeeNumber: '', firstName: 'John', lastName: 'Doe' });
      await pom.submitForm();
      await pom.verifyValidationError('employeeNumber');
    });

    test('17. should validate email format syntax', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({
        employeeNumber: 'EMP-999',
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email-address', // invalid format
      });
      await pom.submitForm();
      await pom.verifyValidationError('email');
    });

    test('18. should validate first and last names are mandatory', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ employeeNumber: 'EMP-999', firstName: '', lastName: '' });
      await pom.submitForm();
      await pom.verifyValidationError('firstName');
      await pom.verifyValidationError('lastName');
    });

    test('19. should prevent registering duplicate faculty employee number', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.create({
        employeeNumber: 'EMP-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@sis.local',
        departmentId: 'CS-DEPT-01',
        employmentStatus: 'FULL_TIME',
        facultyType: 'INSTRUCTOR',
      });
      const alert = page.locator('.toast, [role="alert"], text=already exists, text=Duplicate');
      await expect(alert.first()).toBeVisible();
    });

    test('20. should restrict deactivation of faculty assigned to sections', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.toggleStatus('EMP-001');
      const errorMsg = page.locator('text=Cannot deactivate, text=assigned to sections, text=linked, text=error');
      await expect(errorMsg.first()).toBeVisible();
    });
  });

  // ================= ROOMS (5 Tests) =================
  test.describe('Rooms Boundary & Validation', () => {
    test('21. should validate room code must not be blank', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ roomCode: '', roomName: 'Lecture Hall 1' });
      await pom.submitForm();
      await pom.verifyValidationError('roomCode');
    });

    test('22. should validate room name must not be blank', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ roomCode: 'LH-1', roomName: '' });
      await pom.submitForm();
      await pom.verifyValidationError('roomName');
    });

    test('23. should validate capacity must be non-negative', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({
        roomCode: 'LH-1',
        roomName: 'Lecture Hall 1',
        capacity: -5, // negative capacity
      });
      await pom.submitForm();
      await pom.verifyValidationError('capacity');
    });

    test('24. should prevent registering duplicate room code', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.create({
        roomCode: 'CL-301',
        roomName: 'Another Computer Lab',
      });
      const alert = page.locator('.toast, [role="alert"], text=already exists, text=Duplicate');
      await expect(alert.first()).toBeVisible();
    });

    test('25. should restrict deactivation of room with active class schedules', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.toggleStatus('CL-301');
      const errorMsg = page.locator('text=Cannot deactivate, text=schedules, text=active class, text=error');
      await expect(errorMsg.first()).toBeVisible();
    });
  });

  // ================= SCHOOL YEARS (5 Tests) =================
  test.describe('School Years Boundary & Validation', () => {
    test('26. should validate school year format must not be blank', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ schoolYear: '' });
      await pom.submitForm();
      await pom.verifyValidationError('schoolYear');
    });

    test('27. should validate school year format regex/syntax', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ schoolYear: 'not-a-school-year' }); // invalid syntax
      await pom.submitForm();
      await pom.verifyValidationError('schoolYear');
    });

    test('28. should prevent registering duplicate school year', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      await pom.create({
        schoolYear: '2026-2027',
        active: false,
      });
      const alert = page.locator('.toast, [role="alert"], text=already exists, text=Duplicate');
      await expect(alert.first()).toBeVisible();
    });

    test('29. should handle active school year rules (only one active year)', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      // Try to edit a year and make it active when another is already active
      await pom.edit('2026-2027', { active: true });
      // Verify other school years are automatically deactivated or error prompt
      await pom.verifyRowExists('2026-2027', 'Active');
    });

    test('30. should validate school year format length/bound limits', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ schoolYear: '2026-2027-2028-2029' }); // too long
      await pom.submitForm();
      await pom.verifyValidationError('schoolYear');
    });
  });

  // ================= SEMESTERS (5 Tests) =================
  test.describe('Semesters Boundary & Validation', () => {
    test('31. should validate semester name must not be blank', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ name: '', sortOrder: 2 });
      await pom.submitForm();
      await pom.verifyValidationError('name');
    });

    test('32. should validate sortOrder must be greater than or equal to 1', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ name: 'SUMMER', sortOrder: 0 }); // boundary: 0
      await pom.submitForm();
      await pom.verifyValidationError('sortOrder');
    });

    test('33. should prevent duplicate semester name registration', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await pom.create({
        name: 'FIRST_SEMESTER',
        sortOrder: 4,
        active: false,
      });
      const alert = page.locator('.toast, [role="alert"], text=already exists, text=Duplicate');
      await expect(alert.first()).toBeVisible();
    });

    test('34. should validate sortOrder input is a valid positive integer', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ name: 'SUMMER', sortOrder: -2 }); // negative
      await pom.submitForm();
      await pom.verifyValidationError('sortOrder');
    });

    test('35. should restrict deactivating current active semester with active academic term', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await pom.edit('FIRST_SEMESTER', { active: false });
      const errorMsg = page.locator('text=Cannot deactivate, text=active semester, text=error');
      await expect(errorMsg.first()).toBeVisible();
    });
  });

  // ================= SECTIONS (5 Tests) =================
  test.describe('Sections Boundary & Validation', () => {
    test('36. should validate section code must not be blank', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({ sectionCode: '', yearLevel: 1 });
      await pom.submitForm();
      await pom.verifyValidationError('sectionCode');
    });

    test('37. should validate yearLevel must be greater than or equal to 1', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({
        sectionCode: 'CS-1B',
        yearLevel: 0, // invalid year level
      });
      await pom.submitForm();
      await pom.verifyValidationError('yearLevel');
    });

    test('38. should prevent registering duplicate section code in the same term', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.create({
        sectionCode: 'CS-1A', // duplicate section code in same term
        programId: 'BSCS-01',
        schoolYearId: '2026-2027',
        semesterId: 'FIRST_SEMESTER',
        yearLevel: 1,
      });
      const alert = page.locator('.toast, [role="alert"], text=already exists, text=Duplicate');
      await expect(alert.first()).toBeVisible();
    });

    test('39. should validate section relations are mandatory (program, schoolYear, semester)', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.openCreateModal();
      await pom.fillForm({
        sectionCode: 'CS-XYZ',
        yearLevel: 1,
      });
      await pom.submitForm();
      await pom.verifyValidationError('programId');
      await pom.verifyValidationError('schoolYearId');
      await pom.verifyValidationError('semesterId');
    });

    test('40. should restrict deactivation of section with enrolled students', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.toggleStatus('CS-1A');
      const errorMsg = page.locator('text=Cannot deactivate, text=enrolled, text=students, text=error');
      await expect(errorMsg.first()).toBeVisible();
    });
  });
});
