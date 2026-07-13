import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth-helper';

test.describe('Curriculum Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate, perform Curriculum CRUD, and use Curriculum Builder', async ({ page }) => {
    // 1. Navigation
    // Navigate to Academic Setup
    await page.click('a[href*="/setup"]');
    await page.waitForLoadState('networkidle');
    
    // Select "Curricula" tab
    const curriculaTab = page.locator('a[href*="/setup/curricula"], a:has-text("Curricula")');
    await curriculaTab.click();
    await page.waitForLoadState('networkidle');
    
    // Verify the URL is /setup/curricula and the tab is active
    await expect(page).toHaveURL(/\/setup\/curricula/);
    await expect(curriculaTab).toHaveClass(/border-\[\#0b1f3a\]/);

    // 2. Curriculum CRUD - Create
    const uniqueId = Date.now();
    const curriculumCode = `CURR-${uniqueId}`;
    const curriculumName = `Curriculum ${uniqueId}`;
    const schoolYear = '2026-2027';
    const version = '1.0';
    const description = 'Test description for curriculum';

    // Click "New Curriculum"
    await page.click('button:has-text("New Curriculum")');
    
    // Fill form
    // Program select
    await page.click('#programId');
    await page.waitForSelector('[role="option"]');
    await page.click('[role="option"]'); // select the first program in the dropdown
    
    // Code, Name, School Year, Version
    await page.fill('#curriculumCode', curriculumCode);
    await page.fill('#curriculumName', curriculumName);
    await page.fill('#effectiveSchoolYear', schoolYear);
    await page.fill('#version', version);
    
    // Status (Draft)
    await page.click('#status');
    await page.waitForSelector('[role="option"]');
    await page.click('[role="option"]:has-text("Draft")');
    
    // Description
    await page.fill('#description', description);
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Curriculum created successfully');
    
    // Verify new curriculum appears in the list
    const newRow = page.locator(`tr:has-text("${curriculumCode}")`);
    await expect(newRow).toBeVisible();
    await expect(newRow).toContainText(curriculumName);
    await expect(newRow).toContainText('Draft');

    // 3. Curriculum CRUD - Edit
    await newRow.locator('button[title="Edit Curriculum"]').click();
    
    // Modify description
    const editedDescription = `${description} Edited`;
    const editedName = `${curriculumName} Edited`;
    await page.fill('#curriculumName', editedName);
    await page.fill('#description', editedDescription);
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Curriculum updated successfully');
    
    // Verify change
    await expect(newRow).toContainText(editedName);

    // 4. Curriculum CRUD - Activate
    await newRow.locator('button[title="Activate Curriculum"]').click();
    
    // Confirm Warning
    await page.click('button:has-text("Confirm Activation")');
    await page.waitForSelector('text=activated successfully');
    
    // Verify status updates to ACTIVE in the table
    await expect(newRow).toContainText('Active');

    // 5. Curriculum Builder
    // Click "Open Builder"
    await newRow.locator('a[title="Open Builder"]').click();
    await page.waitForLoadState('networkidle');
    
    // Verify it displays the header card with correct metadata
    await expect(page).toHaveURL(/\/setup\/curricula\/[0-9a-fA-F-]{36}/);
    await expect(page.locator('h1')).toContainText(editedName);
    await expect(page.locator('body')).toContainText(curriculumCode);
    await expect(page.locator('body')).toContainText(version);
    await expect(page.locator('body')).toContainText('Active');

    // Click "Add Course" inside First Year - First Semester term block
    const termBlock = page.locator('div.bg-white:has(h3:has-text("First Year - First Semester"))');
    await termBlock.locator('button:has-text("Add Course")').click();

    // Select course in modal
    await page.locator('button[role="combobox"]').click();
    
    // Select the first course option in the combobox list
    const firstCourseOption = page.locator('button:has-text(" - ")').first();
    const courseText = await firstCourseOption.textContent() || '';
    const courseCode = courseText.split(' - ')[0].trim();
    const courseTitle = courseText.substring(courseText.indexOf(' - ') + 3).trim();
    await firstCourseOption.click();

    // Set sort order = 1
    await page.fill('#sortOrder', '1');

    // Required status = REQUIRED
    await page.click('#requiredStatus');
    await page.click('[role="option"]:has-text("Required")');

    // Select a course as prerequisite (if any available)
    const prereqSearchInput = page.locator('input[placeholder="Search prerequisites..."]');
    let prereqCode = '';
    const labelSelector = 'label:has(input[type="checkbox"])';
    const labelCount = await page.locator(labelSelector).count();
    
    if (labelCount > 0) {
      const prereqLabel = page.locator(labelSelector).first();
      const prereqText = await prereqLabel.textContent() || '';
      const prereqCodeMatch = prereqText.match(/^([A-Z0-9a-z-]+)\s*[\u2013-]/);
      prereqCode = prereqCodeMatch ? prereqCodeMatch[1].trim() : '';
      await prereqLabel.locator('input[type="checkbox"]').check();
    }

    // Submit assignment
    await page.click('button:has-text("Assign Course")');
    await page.waitForSelector('text=Course assigned successfully');

    // Verify course is assigned and displayed under correct term heading
    const assignedRow = termBlock.locator(`tr:has-text("${courseCode}")`);
    await expect(assignedRow).toBeVisible();
    await expect(assignedRow.locator('td').nth(0)).toContainText(courseCode);
    await expect(assignedRow.locator('td').nth(1)).toContainText(courseTitle);
    await expect(assignedRow.locator('td').nth(6)).toContainText('Required');
    
    if (prereqCode) {
      await expect(assignedRow.locator('td').nth(4)).toContainText(prereqCode);
    }

    // Get lecture / lab hours and credit units from row to verify totals
    const lecLabText = await assignedRow.locator('td').nth(2).textContent() || '';
    const [lecHours, labHours] = lecLabText.split('/').map(s => s.trim());
    const creditUnitsText = await assignedRow.locator('td').nth(3).textContent() || '';

    // Verify term summary aggregates correct totals
    await expect(termBlock).toContainText(`Lecture: ${lecHours} hrs`);
    await expect(termBlock).toContainText(`Lab: ${labHours} hrs`);
    await expect(termBlock).toContainText(`Credits: ${creditUnitsText} units`);

    // Edit assigned course
    await assignedRow.locator('button').first().click();
    await page.waitForSelector('text=Edit Course Assignment');

    // Change sort order to 2
    await page.fill('#sortOrder', '2');

    // Change requirement status to Optional
    await page.click('#requiredStatus');
    await page.click('[role="option"]:has-text("Optional")');

    // Save Changes
    await page.click('button:has-text("Save Changes")');
    await page.waitForSelector('text=assignment updated successfully');

    // Verify change
    await expect(assignedRow.locator('td').nth(6)).toContainText('Optional');

    // Remove/Delete the course assignment
    await assignedRow.locator('button').last().click();
    await page.waitForSelector('text=Remove Course Assignment');
    
    // Confirm delete
    await page.click('button:has-text("Remove")');
    await page.waitForSelector('text=assignment removed successfully');

    // Verify it no longer appears
    await expect(assignedRow).not.toBeVisible();
  });
});
