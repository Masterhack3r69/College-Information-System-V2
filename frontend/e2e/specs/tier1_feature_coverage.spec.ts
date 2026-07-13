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

test.describe('Tier 1: Feature Coverage (40 E2E tests)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ================= DEPARTMENTS (5 Tests) =================
  test.describe('Departments Module', () => {
    test('1. should view departments list', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await expect(page).toHaveURL('/setup/departments');
      await expect(page.locator('h1, h2, th')).toContainText(/Department/i);
    });

    test('2. should create a new department', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await pom.create({
        departmentCode: 'CS-DEPT-01',
        departmentName: 'Computer Science Department',
        dean: 'Dr. Alan Turing',
        description: 'Department of Computer Science',
      });
      await pom.verifyRowExists('CS-DEPT-01', 'Computer Science Department');
    });

    test('3. should edit an existing department', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await pom.edit('CS-DEPT-01', {
        departmentName: 'Computer Science & AI Department',
        dean: 'Dr. Grace Hopper',
      });
      await pom.verifyRowExists('CS-DEPT-01', 'Computer Science & AI Department');
    });

    test('4. should toggle status of department', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await pom.toggleStatus('CS-DEPT-01');
      // Verify no crash or status changed indicator
      await expect(page.locator('text=Status updated, text=Success, text=Department')).toBeVisible();
    });

    test('5. should search departments by code/name', async ({ page }) => {
      const pom = new DepartmentsPOM(page);
      await pom.navigate();
      await pom.search('CS-DEPT-01');
      await pom.verifyRowExists('CS-DEPT-01', 'Computer Science');
    });
  });

  // ================= PROGRAMS (5 Tests) =================
  test.describe('Programs Module', () => {
    test('6. should view programs list', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      await expect(page).toHaveURL('/setup/programs');
      await expect(page.locator('h1, h2, th')).toContainText(/Program/i);
    });

    test('7. should create a new program', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      await pom.create({
        programCode: 'BSCS-01',
        programName: 'Bachelor of Science in Computer Science',
        departmentId: 'CS-DEPT-01',
        degreeType: 'BACHELOR',
        programDuration: 4,
        description: 'Undergraduate Computer Science Program',
      });
      await pom.verifyRowExists('BSCS-01', 'Bachelor of Science in Computer Science');
    });

    test('8. should edit an existing program', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      await pom.edit('BSCS-01', {
        programName: 'BS in Computer Science (Honors)',
        programDuration: 4,
      });
      await pom.verifyRowExists('BSCS-01', 'BS in Computer Science (Honors)');
    });

    test('9. should search programs by code/name', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      await pom.search('BSCS-01');
      await pom.verifyRowExists('BSCS-01', 'BS in Computer Science');
    });

    test('10. should verify program details and duration', async ({ page }) => {
      const pom = new ProgramsPOM(page);
      await pom.navigate();
      const row = page.locator('tr:has-text("BSCS-01")');
      await expect(row).toContainText('4'); // duration
      await expect(row).toContainText('BACHELOR');
    });
  });

  // ================= COURSES (5 Tests) =================
  test.describe('Courses Module', () => {
    test('11. should view courses list', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await expect(page).toHaveURL('/setup/courses');
      await expect(page.locator('h1, h2, th')).toContainText(/Course/i);
    });

    test('12. should create a new course', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await pom.create({
        courseCode: 'CS101',
        courseTitle: 'Introduction to Programming',
        courseDescription: 'Introduction to computer science and programming concepts',
        lectureHoursPerWeek: 3,
        laboratoryHoursPerWeek: 3,
        creditUnits: 4,
        courseType: 'MAJOR',
        departmentId: 'CS-DEPT-01',
      });
      await pom.verifyRowExists('CS101', 'Introduction to Programming');
    });

    test('13. should edit an existing course', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await pom.edit('CS101', {
        courseTitle: 'Introduction to Computer Science & Programming',
        creditUnits: 4,
      });
      await pom.verifyRowExists('CS101', 'Introduction to Computer Science');
    });

    test('14. should search courses by code/title', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      await pom.search('CS101');
      await pom.verifyRowExists('CS101', 'Introduction to Computer Science');
    });

    test('15. should verify course hours and units', async ({ page }) => {
      const pom = new CoursesPOM(page);
      await pom.navigate();
      const row = page.locator('tr:has-text("CS101")');
      await expect(row).toContainText('3'); // lecture hours
      await expect(row).toContainText('4'); // credit units
    });
  });

  // ================= FACULTY (5 Tests) =================
  test.describe('Faculty Module', () => {
    test('16. should view faculty list', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await expect(page).toHaveURL('/setup/faculty');
      await expect(page.locator('h1, h2, th')).toContainText(/Faculty/i);
    });

    test('17. should create a new faculty member', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.create({
        employeeNumber: 'EMP-001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada.lovelace@sis.local',
        departmentId: 'CS-DEPT-01',
        employmentStatus: 'FULL_TIME',
        facultyType: 'PROFESSOR',
      });
      await pom.verifyRowExists('EMP-001', 'Ada Lovelace');
    });

    test('18. should edit an existing faculty member', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.edit('EMP-001', {
        firstName: 'Ada Augusta',
        specialization: 'Analytical Engine Programming',
      });
      await pom.verifyRowExists('EMP-001', 'Ada Augusta Lovelace');
    });

    test('19. should toggle status of faculty member', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.toggleStatus('EMP-001');
      await expect(page.locator('text=Status updated, text=Success, text=Faculty')).toBeVisible();
    });

    test('20. should search faculty by employee number/name', async ({ page }) => {
      const pom = new FacultyPOM(page);
      await pom.navigate();
      await pom.search('EMP-001');
      await pom.verifyRowExists('EMP-001', 'Lovelace');
    });
  });

  // ================= ROOMS (5 Tests) =================
  test.describe('Rooms Module', () => {
    test('21. should view rooms list', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await expect(page).toHaveURL('/setup/rooms');
      await expect(page.locator('h1, h2, th')).toContainText(/Room/i);
    });

    test('22. should create a new room', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.create({
        roomCode: 'CL-301',
        roomName: 'Computer Lab 301',
        capacity: 40,
      });
      await pom.verifyRowExists('CL-301', 'Computer Lab 301');
    });

    test('23. should edit an existing room', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.edit('CL-301', {
        roomName: 'Advanced Computer Lab 301',
        capacity: 45,
      });
      await pom.verifyRowExists('CL-301', 'Advanced Computer Lab 301');
    });

    test('24. should toggle status of room', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.toggleStatus('CL-301');
      await expect(page.locator('text=Status updated, text=Success, text=Room')).toBeVisible();
    });

    test('25. should search rooms by code/name', async ({ page }) => {
      const pom = new RoomsPOM(page);
      await pom.navigate();
      await pom.search('CL-301');
      await pom.verifyRowExists('CL-301', 'Advanced Computer Lab');
    });
  });

  // ================= SCHOOL YEARS (5 Tests) =================
  test.describe('School Years Module', () => {
    test('26. should view school years list', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      await expect(page).toHaveURL('/setup/school-years');
      await expect(page.locator('h1, h2, th')).toContainText(/School Year/i);
    });

    test('27. should create a new school year', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      await pom.create({
        schoolYear: '2026-2027',
        active: false,
      });
      await pom.verifyRowExists('2026-2027');
    });

    test('28. should edit an existing school year', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      await pom.edit('2026-2027', {
        active: true,
      });
      await pom.verifyRowExists('2026-2027', 'Active');
    });

    test('29. should verify active school year display', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      const activeRow = page.locator('tr:has-text("Active")');
      await expect(activeRow).toBeVisible();
    });

    test('30. should view school year details', async ({ page }) => {
      const pom = new SchoolYearsPOM(page);
      await pom.navigate();
      const row = page.locator('tr:has-text("2026-2027")');
      await expect(row).toContainText('2026-2027');
    });
  });

  // ================= SEMESTERS (5 Tests) =================
  test.describe('Semesters Module', () => {
    test('31. should view semesters list', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await expect(page).toHaveURL('/setup/semesters');
      await expect(page.locator('h1, h2, th')).toContainText(/Semester/i);
    });

    test('32. should create a new semester', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await pom.create({
        name: 'FIRST_SEMESTER',
        sortOrder: 1,
        active: true,
      });
      await pom.verifyRowExists('FIRST_SEMESTER', '1');
    });

    test('33. should edit an existing semester', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await pom.edit('FIRST_SEMESTER', {
        sortOrder: 1,
        active: false,
      });
      await pom.verifyRowExists('FIRST_SEMESTER', '1');
    });

    test('34. should verify semesters table contents', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      const table = page.locator('table');
      await expect(table).toContainText('FIRST_SEMESTER');
    });

    test('35. should verify active semester state changes', async ({ page }) => {
      const pom = new SemestersPOM(page);
      await pom.navigate();
      await pom.edit('FIRST_SEMESTER', { active: true });
      await pom.verifyRowExists('FIRST_SEMESTER');
    });
  });

  // ================= SECTIONS (5 Tests) =================
  test.describe('Sections Module', () => {
    test('36. should view sections list', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await expect(page).toHaveURL('/setup/sections');
      await expect(page.locator('h1, h2, th')).toContainText(/Section/i);
    });

    test('37. should create a new section', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.create({
        sectionCode: 'CS-1A',
        programId: 'BSCS-01',
        schoolYearId: '2026-2027',
        semesterId: 'FIRST_SEMESTER',
        yearLevel: 1,
      });
      await pom.verifyRowExists('CS-1A', 'BSCS-01');
    });

    test('38. should edit an existing section', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.edit('CS-1A', {
        yearLevel: 2,
      });
      await pom.verifyRowExists('CS-1A');
    });

    test('39. should toggle status of section', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.toggleStatus('CS-1A');
      await expect(page.locator('text=Status updated, text=Success, text=Section')).toBeVisible();
    });

    test('40. should search sections by code', async ({ page }) => {
      const pom = new SectionsPOM(page);
      await pom.navigate();
      await pom.search('CS-1A');
      await pom.verifyRowExists('CS-1A');
    });
  });
});
