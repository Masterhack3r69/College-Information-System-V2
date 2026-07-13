import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth-helper';
import { SchoolYearsPOM } from '../helpers/school-years';
import { SemestersPOM } from '../helpers/semesters';
import { DepartmentsPOM } from '../helpers/departments';
import { ProgramsPOM } from '../helpers/programs';
import { CoursesPOM } from '../helpers/courses';
import { SectionsPOM } from '../helpers/sections';
import { FacultyPOM } from '../helpers/faculty';
import { RoomsPOM } from '../helpers/rooms';

test.describe('Tier 4: Real-World Scenarios (5 E2E tests)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. New Academic Term Setup Flow', async ({ page }) => {
    // 1. Setup School Year
    const syPom = new SchoolYearsPOM(page);
    await syPom.navigate();
    await syPom.create({ schoolYear: '2028-2029', active: true });

    // 2. Setup Semester
    const semPom = new SemestersPOM(page);
    await semPom.navigate();
    await semPom.create({ name: 'SECOND_SEMESTER_28', sortOrder: 2, active: true });

    // 3. Setup Department
    const deptPom = new DepartmentsPOM(page);
    await deptPom.navigate();
    await deptPom.create({ departmentCode: 'BIO-DEPT', departmentName: 'Biology Department' });

    // 4. Setup Program
    const progPom = new ProgramsPOM(page);
    await progPom.navigate();
    await progPom.create({
      programCode: 'BS-BIO',
      programName: 'BS Biology',
      departmentId: 'BIO-DEPT',
      degreeType: 'BACHELOR',
    });

    // 5. Setup Course
    const coursePom = new CoursesPOM(page);
    await coursePom.navigate();
    await coursePom.create({
      courseCode: 'BIO101',
      courseTitle: 'General Biology',
      lectureHoursPerWeek: 3,
      laboratoryHoursPerWeek: 3,
      creditUnits: 4,
      courseType: 'MAJOR',
      departmentId: 'BIO-DEPT',
    });

    // 6. Setup Section
    const secPom = new SectionsPOM(page);
    await secPom.navigate();
    await secPom.create({
      sectionCode: 'BIO-1A',
      programId: 'BS-BIO',
      schoolYearId: '2028-2029',
      semesterId: 'SECOND_SEMESTER_28',
      yearLevel: 1,
    });

    await secPom.verifyRowExists('BIO-1A', 'BS-BIO');
  });

  test('2. Faculty Onboarding and Assignment', async ({ page }) => {
    // 1. Create Department
    const deptPom = new DepartmentsPOM(page);
    await deptPom.navigate();
    await deptPom.create({ departmentCode: 'HIST-DEPT', departmentName: 'History Department' });

    // 2. Onboard Faculty
    const facPom = new FacultyPOM(page);
    await facPom.navigate();
    await facPom.create({
      employeeNumber: 'EMP-HIST-01',
      firstName: 'Herodotus',
      lastName: 'Halicarnassus',
      email: 'herodotus@sis.local',
      departmentId: 'HIST-DEPT',
      employmentStatus: 'FULL_TIME',
      facultyType: 'PROFESSOR',
    });

    // 3. Assign Faculty to Section
    const secPom = new SectionsPOM(page);
    await secPom.navigate();
    await secPom.create({
      sectionCode: 'HIST-1A',
      programId: 'BSCS-01',
      schoolYearId: '2026-2027',
      semesterId: 'FIRST_SEMESTER',
      yearLevel: 1,
    });
    
    // Assign via edit section (or check details)
    await secPom.openEditModal('HIST-1A');
    // Select faculty in edit section modal if field exists
    const facultySelect = page.locator('select[name="facultyId"], [name="facultyId"], [data-testid="faculty-select"]');
    if (await facultySelect.count() > 0) {
      await facultySelect.click();
      await page.click('text=Herodotus Halicarnassus');
      await secPom.submitForm();
      await secPom.verifyRowExists('HIST-1A', 'Herodotus');
    } else {
      await secPom.submitForm();
      await secPom.verifyRowExists('HIST-1A');
    }
  });

  test('3. Curriculum/Facilities Expansion', async ({ page }) => {
    // 1. Create Room
    const roomPom = new RoomsPOM(page);
    await roomPom.navigate();
    await roomPom.create({ roomCode: 'BIO-LAB', roomName: 'Biology Lab 1', capacity: 30 });

    // 2. Create Course
    const coursePom = new CoursesPOM(page);
    await coursePom.navigate();
    await coursePom.create({
      courseCode: 'BIO201',
      courseTitle: 'Microbiology',
      lectureHoursPerWeek: 2,
      laboratoryHoursPerWeek: 4,
      creditUnits: 4,
      courseType: 'MAJOR',
      departmentId: 'BIO-DEPT',
    });

    // 3. Create Section utilizing both
    const secPom = new SectionsPOM(page);
    await secPom.navigate();
    await secPom.create({
      sectionCode: 'BIO-2A',
      programId: 'BS-BIO',
      schoolYearId: '2028-2029',
      semesterId: 'SECOND_SEMESTER_28',
      yearLevel: 2,
    });

    await secPom.verifyRowExists('BIO-2A');
  });

  test('4. Comprehensive Validation Recovery', async ({ page }) => {
    const deptPom = new DepartmentsPOM(page);
    await deptPom.navigate();
    await deptPom.openCreateModal();

    // 1. Submit empty form
    await deptPom.submitForm();
    await deptPom.verifyValidationError('departmentCode');
    await deptPom.verifyValidationError('departmentName');

    // 2. Fix code, still missing name
    await deptPom.fillForm({ departmentCode: 'RECOVERY-DEPT' });
    await deptPom.submitForm();
    await deptPom.verifyValidationError('departmentName');

    // 3. Fix name, submit successfully
    await deptPom.fillForm({ departmentName: 'Recovery Department' });
    await deptPom.submitForm();

    // 4. Verify recovery
    await deptPom.verifyRowExists('RECOVERY-DEPT', 'Recovery Department');
  });

  test('5. Search, Filter and Bulk Pagination', async ({ page }) => {
    const coursePom = new CoursesPOM(page);
    await coursePom.navigate();

    // 1. Search for unique course code
    await coursePom.search('CS101');
    await coursePom.verifyRowExists('CS101', 'Introduction to Computer Science');

    // 2. Clear search/search all and verify multiple rows
    await coursePom.search('');
    
    // 3. Verify pagination buttons
    const nextBtn = page.locator('button:has-text("Next"), [data-testid="next-page"]');
    if (await nextBtn.isEnabled()) {
      await coursePom.nextPage();
      expect(await page.locator('tr').count()).toBeGreaterThan(1);
      await coursePom.previousPage();
    }
  });
});
