package com.school.sis.grade;

import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.curriculum.entity.Curriculum;
import com.school.sis.curriculum.entity.CurriculumCourse;
import com.school.sis.curriculum.entity.CurriculumStatus;
import com.school.sis.curriculum.entity.RequiredStatus;
import com.school.sis.curriculum.repository.CurriculumCourseRepository;
import com.school.sis.curriculum.repository.CurriculumRepository;
import com.school.sis.enrollment.dto.EnrollmentRequest;
import com.school.sis.enrollment.dto.EnrollmentResponse;
import com.school.sis.enrollment.dto.EnrollmentSubjectRequest;
import com.school.sis.enrollment.dto.EnrollmentValidationResponse;
import com.school.sis.enrollment.service.EnrollmentService;
import com.school.sis.grade.dto.GradeClassResponse;
import com.school.sis.grade.dto.GradeEncodeRequest;
import com.school.sis.grade.dto.GradeEntryRequest;
import com.school.sis.grade.entity.GradeRemark;
import com.school.sis.grade.entity.GradeStatus;
import com.school.sis.grade.service.GradeService;
import com.school.sis.grade.service.GradebookService;
import com.school.sis.grade.dto.GradebookRequests;
import com.school.sis.grade.dto.GradebookResponse;
import com.school.sis.grade.entity.*;
import com.school.sis.grade.repository.GradingScaleRepository;
import com.school.sis.grade.repository.GradingTemplateRepository;
import com.school.sis.schedule.dto.ScheduleMeetingRequest;
import com.school.sis.schedule.dto.ScheduleRequest;
import com.school.sis.schedule.dto.ScheduleResponse;
import com.school.sis.schedule.entity.ScheduleStatus;
import com.school.sis.schedule.service.ScheduleService;
import com.school.sis.setup.entity.ActiveStatus;
import com.school.sis.setup.entity.Course;
import com.school.sis.setup.entity.CourseType;
import com.school.sis.setup.entity.DegreeType;
import com.school.sis.setup.entity.Department;
import com.school.sis.setup.entity.EmploymentStatus;
import com.school.sis.setup.entity.Faculty;
import com.school.sis.setup.entity.FacultyType;
import com.school.sis.setup.entity.Program;
import com.school.sis.setup.entity.Room;
import com.school.sis.setup.entity.SchoolYear;
import com.school.sis.setup.entity.Section;
import com.school.sis.setup.entity.Semester;
import com.school.sis.setup.repository.CourseRepository;
import com.school.sis.setup.repository.DepartmentRepository;
import com.school.sis.setup.repository.FacultyRepository;
import com.school.sis.setup.repository.ProgramRepository;
import com.school.sis.setup.repository.RoomRepository;
import com.school.sis.setup.repository.SchoolYearRepository;
import com.school.sis.setup.repository.SectionRepository;
import com.school.sis.setup.repository.SemesterRepository;
import com.school.sis.student.entity.AcademicStatus;
import com.school.sis.student.entity.Gender;
import com.school.sis.student.entity.Student;
import com.school.sis.student.entity.StudentClassification;
import com.school.sis.student.entity.StudentStatus;
import com.school.sis.student.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
class GradeServiceTests {

    private final GradeService gradeService;
    private final GradebookService gradebookService;
    private final GradingScaleRepository gradingScaleRepository;
    private final GradingTemplateRepository gradingTemplateRepository;
    private final EnrollmentService enrollmentService;
    private final ScheduleService scheduleService;
    private final DepartmentRepository departmentRepository;
    private final ProgramRepository programRepository;
    private final CourseRepository courseRepository;
    private final FacultyRepository facultyRepository;
    private final RoomRepository roomRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final SemesterRepository semesterRepository;
    private final SectionRepository sectionRepository;
    private final CurriculumRepository curriculumRepository;
    private final CurriculumCourseRepository curriculumCourseRepository;
    private final StudentRepository studentRepository;

    private Program program;
    private Course prerequisiteCourse;
    private Course advancedCourse;
    private Faculty faculty;
    private Faculty otherFaculty;
    private Room roomOne;
    private Room roomTwo;
    private SchoolYear schoolYear;
    private SchoolYear nextSchoolYear;
    private Semester semester;
    private Semester nextSemester;
    private Section section;
    private Section nextSection;
    private Student student;
    private Student otherStudent;
    private Curriculum curriculum;

    @Autowired
    GradeServiceTests(
            GradeService gradeService,
            GradebookService gradebookService,
            GradingScaleRepository gradingScaleRepository,
            GradingTemplateRepository gradingTemplateRepository,
            EnrollmentService enrollmentService,
            ScheduleService scheduleService,
            DepartmentRepository departmentRepository,
            ProgramRepository programRepository,
            CourseRepository courseRepository,
            FacultyRepository facultyRepository,
            RoomRepository roomRepository,
            SchoolYearRepository schoolYearRepository,
            SemesterRepository semesterRepository,
            SectionRepository sectionRepository,
            CurriculumRepository curriculumRepository,
            CurriculumCourseRepository curriculumCourseRepository,
            StudentRepository studentRepository
    ) {
        this.gradeService = gradeService;
        this.gradebookService = gradebookService;
        this.gradingScaleRepository = gradingScaleRepository;
        this.gradingTemplateRepository = gradingTemplateRepository;
        this.enrollmentService = enrollmentService;
        this.scheduleService = scheduleService;
        this.departmentRepository = departmentRepository;
        this.programRepository = programRepository;
        this.courseRepository = courseRepository;
        this.facultyRepository = facultyRepository;
        this.roomRepository = roomRepository;
        this.schoolYearRepository = schoolYearRepository;
        this.semesterRepository = semesterRepository;
        this.sectionRepository = sectionRepository;
        this.curriculumRepository = curriculumRepository;
        this.curriculumCourseRepository = curriculumCourseRepository;
        this.studentRepository = studentRepository;
    }

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Department department = new Department();
        department.setDepartmentCode("GRD-CCS-" + suffix);
        department.setDepartmentName("Grade Department " + suffix);
        department.setStatus(ActiveStatus.ACTIVE);
        department = departmentRepository.save(department);

        program = new Program();
        program.setProgramCode("GRD-BSIT-" + suffix);
        program.setProgramName("Grade Program");
        program.setDepartment(department);
        program.setDegreeType(DegreeType.BACHELOR);
        program.setProgramDuration(4);
        program.setStatus(ActiveStatus.ACTIVE);
        program = programRepository.save(program);

        prerequisiteCourse = course("GRD-101-" + suffix, "Prerequisite Course", department);
        advancedCourse = course("GRD-201-" + suffix, "Advanced Course", department);
        faculty = faculty("GRD-F1-" + suffix, "Assigned", department);
        otherFaculty = faculty("GRD-F2-" + suffix, "Other", department);
        roomOne = room("GRD-R1-" + suffix);
        roomTwo = room("GRD-R2-" + suffix);
        schoolYear = schoolYear("GRD-2026-" + suffix);
        nextSchoolYear = schoolYear("GRD-2027-" + suffix);
        semester = semester("GRDFIRST" + suffix, 1);
        nextSemester = semester("GRDSECOND" + suffix, 2);

        curriculum = new Curriculum();
        curriculum.setProgram(program);
        curriculum.setCurriculumCode("GRD-CUR-" + suffix);
        curriculum.setCurriculumName("Grade Curriculum");
        curriculum.setEffectiveSchoolYear("2026-2027");
        curriculum.setVersion("1");
        curriculum.setStatus(CurriculumStatus.ACTIVE);
        curriculum = curriculumRepository.save(curriculum);
        curriculumCourse(prerequisiteCourse, 1);
        CurriculumCourse advanced = new CurriculumCourse();
        advanced.setCurriculum(curriculum);
        advanced.setYearLevel(1);
        advanced.setSemester(nextSemester.getName());
        advanced.setCourse(advancedCourse);
        advanced.setSortOrder(2);
        advanced.setRequiredStatus(RequiredStatus.REQUIRED);
        advanced = curriculumCourseRepository.save(advanced);
        advanced.getPrerequisites().add(prerequisiteCourse);
        curriculumCourseRepository.save(advanced);

        section = section("GRD-1A-" + suffix, schoolYear, semester);
        nextSection = section("GRD-1B-" + suffix, nextSchoolYear, nextSemester);

        student = student("GRD-S1-" + suffix, "First");
        otherStudent = student("GRD-S2-" + suffix, "Second");
    }

    @Test
    void createsDraftRowsForConfirmedEnrollmentSubjects() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();

        GradeClassResponse response = gradeService.classGrades(schedule.id(), facultyUser(faculty));

        assertThat(response.grades()).hasSize(2);
        assertThat(response.grades()).extracting("status").containsOnly(GradeStatus.DRAFT);
    }

    @Test
    void facultyCanEncodeAssignedClassButNotAnotherClass() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        GradeClassResponse classGrades = gradeService.classGrades(schedule.id(), facultyUser(faculty));

        GradeClassResponse encoded = gradeService.encode(schedule.id(), new GradeEncodeRequest(List.of(
                new GradeEntryRequest(classGrades.grades().getFirst().enrollmentSubjectId(), new BigDecimal("1.25"), null)
        )), facultyUser(faculty));

        assertThat(encoded.grades().getFirst().status()).isEqualTo(GradeStatus.ENCODED);
        assertThatThrownBy(() -> gradeService.encode(schedule.id(), new GradeEncodeRequest(List.of(
                new GradeEntryRequest(classGrades.grades().getFirst().enrollmentSubjectId(), new BigDecimal("1.50"), null)
        )), facultyUser(otherFaculty)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Faculty can only encode assigned classes");
    }

    @Test
    void rejectsInvalidGradeValuesAndIncrements() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        GradeClassResponse classGrades = gradeService.classGrades(schedule.id(), facultyUser(faculty));

        assertThatThrownBy(() -> gradeService.encode(schedule.id(), new GradeEncodeRequest(List.of(
                new GradeEntryRequest(classGrades.grades().getFirst().enrollmentSubjectId(), new BigDecimal("0.75"), null)
        )), facultyUser(faculty)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Final grade must be between 1.00 and 5.00");

        assertThatThrownBy(() -> gradeService.encode(schedule.id(), new GradeEncodeRequest(List.of(
                new GradeEntryRequest(classGrades.grades().getFirst().enrollmentSubjectId(), new BigDecimal("1.10"), null)
        )), facultyUser(faculty)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Final grade must use 0.25 increments");
    }

    @Test
    void submitRequiresAllClassGrades() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        GradeClassResponse classGrades = gradeService.classGrades(schedule.id(), facultyUser(faculty));
        gradeService.encode(schedule.id(), new GradeEncodeRequest(List.of(
                new GradeEntryRequest(classGrades.grades().getFirst().enrollmentSubjectId(), new BigDecimal("1.25"), null)
        )), facultyUser(faculty));

        assertThatThrownBy(() -> gradeService.submit(schedule.id(), facultyUser(faculty)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("All class grades must be encoded before submission");
    }

    @Test
    void submittedGradesCanBeApprovedLockedAndCreateAcademicRecords() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        encodeAll(schedule, "1.25");

        GradeClassResponse submitted = gradeService.submit(schedule.id(), facultyUser(faculty));
        GradeClassResponse approved = gradeService.approve(schedule.id(), approverUser());
        GradeClassResponse locked = gradeService.lock(schedule.id(), approverUser());

        assertThat(submitted.grades()).extracting("status").containsOnly(GradeStatus.SUBMITTED);
        assertThat(approved.grades()).extracting("status").containsOnly(GradeStatus.APPROVED);
        assertThat(locked.grades()).extracting("status").containsOnly(GradeStatus.LOCKED);
        assertThat(gradeService.academicRecords(student.getId())).hasSize(1);
        assertThat(gradeService.academicRecords(student.getId()).getFirst().earnedUnits()).isEqualByComparingTo("3");

        assertThatThrownBy(() -> gradeService.encode(schedule.id(), new GradeEncodeRequest(List.of(
                new GradeEntryRequest(locked.grades().getFirst().enrollmentSubjectId(), new BigDecimal("1.50"), null)
        )), facultyUser(faculty)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Submitted, approved, or locked grades cannot be edited");
    }

    @Test
    void lockedPassingGradeSatisfiesPrerequisiteAndFailedGradeDoesNot() {
        ScheduleResponse prerequisiteSchedule = confirmedPrerequisiteForStudent(student, "2.00", DayOfWeek.WEDNESDAY, "13:00", "14:00");
        gradeService.lock(prerequisiteSchedule.id(), approverUser());
        EnrollmentResponse advancedEnrollment = enrollment(student, nextSchoolYear, nextSemester, nextSection);
        ScheduleResponse advancedSchedule = schedule(advancedCourse, nextSection, roomTwo, DayOfWeek.TUESDAY, "10:00", "11:00");
        enrollmentService.addSubject(advancedEnrollment.id(), new EnrollmentSubjectRequest(advancedSchedule.id()));

        EnrollmentValidationResponse valid = enrollmentService.validate(advancedEnrollment.id());

        assertThat(valid.valid()).isTrue();

        Student failingStudent = student("GRD-SF-" + UUID.randomUUID().toString().substring(0, 6), "Failing");
        ScheduleResponse failingPrerequisiteSchedule = confirmedPrerequisiteForStudent(failingStudent, "5.00", DayOfWeek.THURSDAY, "13:00", "14:00");
        gradeService.lock(failingPrerequisiteSchedule.id(), approverUser());
        EnrollmentResponse blockedEnrollment = enrollment(failingStudent, nextSchoolYear, nextSemester, nextSection);
        enrollmentService.addSubject(blockedEnrollment.id(), new EnrollmentSubjectRequest(advancedSchedule.id()));

        EnrollmentValidationResponse blocked = enrollmentService.validate(blockedEnrollment.id());

        assertThat(blocked.valid()).isFalse();
        assertThat(blocked.blockingIssues()).extracting("code").contains("PREREQUISITE_NOT_SATISFIED");
    }

    @Test
    void weightedGradebookCalculatesSubmitsApprovesAndLocks() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        GradingScale scale = new GradingScale();
        scale.setScaleCode("SCALE-" + UUID.randomUUID());
        scale.setScaleName("Test Scale");
        GradingScaleBand failed = new GradingScaleBand();
        failed.setMinimumPercentage(BigDecimal.ZERO); failed.setMaximumPercentage(new BigDecimal("74.99")); failed.setGradePoint(new BigDecimal("5.00")); failed.setRemark(GradeRemark.FAILED);
        GradingScaleBand passed = new GradingScaleBand();
        passed.setMinimumPercentage(new BigDecimal("75.00")); passed.setMaximumPercentage(new BigDecimal("100.00")); passed.setGradePoint(new BigDecimal("1.00")); passed.setRemark(GradeRemark.PASSED);
        scale.setBands(List.of(failed, passed));
        scale = gradingScaleRepository.save(scale);

        GradingTemplate template = new GradingTemplate();
        template.setTemplateCode("TPL-" + UUID.randomUUID()); template.setTemplateName("Weighted Test"); template.setProgram(program); template.setCourse(prerequisiteCourse); template.setScale(scale); template.setVersion(1); template.setMidtermWeight(new BigDecimal("50")); template.setFinalWeight(new BigDecimal("50"));
        GradingTemplateCategory midterm = new GradingTemplateCategory(); midterm.setPeriod(GradingPeriod.MIDTERM); midterm.setCategoryName("Midterm Work"); midterm.setWeight(new BigDecimal("100")); midterm.setSortOrder(0);
        GradingTemplateCategory finals = new GradingTemplateCategory(); finals.setPeriod(GradingPeriod.FINAL); finals.setCategoryName("Final Work"); finals.setWeight(new BigDecimal("100")); finals.setSortOrder(0);
        template.setCategories(List.of(midterm, finals)); template = gradingTemplateRepository.save(template);

        GradebookResponse book = gradebookService.initialize(schedule.id(), template.getId(), facultyUser(faculty));
        assertThat(book.students()).allMatch(result -> !result.complete());
        book = gradebookService.saveItem(schedule.id(), new GradebookRequests.Item(null, book.categories().get(0).id(), "Midterm Exam", new BigDecimal("100"), null, 0), facultyUser(faculty));
        book = gradebookService.saveItem(schedule.id(), new GradebookRequests.Item(null, book.categories().get(1).id(), "Final Exam", new BigDecimal("100"), null, 1), facultyUser(faculty));

        ScheduleResponse otherSchedule = schedule(prerequisiteCourse, section, roomTwo, DayOfWeek.FRIDAY, "15:00", "16:00");
        GradebookResponse otherBook = gradebookService.initialize(otherSchedule.id(), template.getId(), facultyUser(faculty));
        UUID firstBookItemId = book.items().getFirst().id();
        assertThatThrownBy(() -> gradebookService.saveItem(otherSchedule.id(),
                new GradebookRequests.Item(firstBookItemId, otherBook.categories().getFirst().id(), "Moved item", new BigDecimal("100"), null, 0),
                facultyUser(faculty)))
                .isInstanceOf(com.school.sis.common.exception.NotFoundException.class)
                .hasMessage("Assessment item not found");

        GradebookResponse populated = book;
        List<GradebookRequests.Score> entries = populated.students().stream().flatMap(result -> populated.items().stream()
                .map(item -> new GradebookRequests.Score(item.id(), result.enrollmentSubjectId(), new BigDecimal("90"), ScoreStatus.SCORED))).toList();
        book = gradebookService.saveScores(schedule.id(), new GradebookRequests.Scores(entries), facultyUser(faculty));
        assertThat(book.students()).allMatch(result -> result.finalPercentage().compareTo(new BigDecimal("90.00")) == 0);

        assertThat(gradebookService.submit(schedule.id(), facultyUser(faculty)).status()).isEqualTo(GradeStatus.SUBMITTED);
        assertThat(gradebookService.approve(schedule.id(), authorityUser("GRADE_REVIEW", "ROLE_SUPER_ADMIN")).status()).isEqualTo(GradeStatus.APPROVED);
        assertThat(gradebookService.lock(schedule.id(), authorityUser("GRADE_LOCK")).status()).isEqualTo(GradeStatus.LOCKED);
        assertThat(gradeService.academicRecords(student.getId())).hasSize(1);
    }

    @Test
    void facultyCanAccessAssignedStudentGradesAndRecords() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(faculty.getId());
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("GRADE_ENCODE"),
                new SimpleGrantedAuthority("ROLE_FACULTY")
        );
        doReturn(authorities).when(principal).getAuthorities();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
        );

        try {
            List<com.school.sis.grade.dto.GradeResponse> grades = gradeService.studentGrades(student.getId());
            assertThat(grades).isNotNull();
            
            List<com.school.sis.grade.dto.AcademicRecordResponse> records = gradeService.academicRecords(student.getId());
            assertThat(records).isNotNull();
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    void facultyCannotAccessUnassignedStudentGradesAndRecords() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(otherFaculty.getId());
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("GRADE_ENCODE"),
                new SimpleGrantedAuthority("ROLE_FACULTY")
        );
        doReturn(authorities).when(principal).getAuthorities();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
        );

        try {
            assertThatThrownBy(() -> gradeService.studentGrades(student.getId()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessage("Faculty can only access assigned students");

            assertThatThrownBy(() -> gradeService.academicRecords(student.getId()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessage("Faculty can only access assigned students");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    void facultyWithBypassRoleCanAccessUnassignedStudentGradesAndRecords() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        List<String> bypassRoles = List.of(
                "ROLE_SUPER_ADMIN",
                "ROLE_REGISTRAR",
                "ROLE_DEAN",
                "ROLE_PROGRAM_HEAD",
                "ROLE_READ_ONLY_STAFF"
        );

        for (String role : bypassRoles) {
            SisUserDetails principal = mock(SisUserDetails.class);
            when(principal.id()).thenReturn(UUID.randomUUID());
            when(principal.facultyId()).thenReturn(otherFaculty.getId());
            Collection<GrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("STUDENT_VIEW"),
                    new SimpleGrantedAuthority(role)
            );
            doReturn(authorities).when(principal).getAuthorities();

            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
            );

            try {
                List<com.school.sis.grade.dto.GradeResponse> grades = gradeService.studentGrades(student.getId());
                assertThat(grades).isNotNull();

                List<com.school.sis.grade.dto.AcademicRecordResponse> records = gradeService.academicRecords(student.getId());
                assertThat(records).isNotNull();
            } finally {
                org.springframework.security.core.context.SecurityContextHolder.clearContext();
            }
        }
    }

    @Test
    void facultyCannotEncodeGradesForUnassignedClass() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        GradeClassResponse classGrades = gradeService.classGrades(schedule.id(), facultyUser(faculty));
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(otherFaculty.getId());
        Collection<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("GRADE_ENCODE"));
        doReturn(authorities).when(principal).getAuthorities();

        assertThatThrownBy(() -> gradeService.encode(schedule.id(), new GradeEncodeRequest(List.of(
                new GradeEntryRequest(classGrades.grades().getFirst().enrollmentSubjectId(), new BigDecimal("1.25"), null)
        )), principal))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Faculty can only encode assigned classes");
    }

    @Test
    void facultyCannotSubmitGradesForUnassignedClass() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(otherFaculty.getId());
        Collection<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("GRADE_ENCODE"));
        doReturn(authorities).when(principal).getAuthorities();

        assertThatThrownBy(() -> gradeService.submit(schedule.id(), principal))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Faculty can only encode assigned classes");
    }

    @Test
    void facultyCannotViewGradesForUnassignedClass() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(otherFaculty.getId());
        Collection<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("GRADE_ENCODE"));
        doReturn(authorities).when(principal).getAuthorities();

        assertThatThrownBy(() -> gradeService.classGrades(schedule.id(), principal))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Faculty can only encode assigned classes");
    }

    @Test
    void nonFacultyAccountWithoutBypassRolesCanAccessStudentGradesIfTheyHaveStudentView() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(null);
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("STUDENT_VIEW")
        );
        doReturn(authorities).when(principal).getAuthorities();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
        );

        try {
            List<com.school.sis.grade.dto.GradeResponse> grades = gradeService.studentGrades(student.getId());
            assertThat(grades).isNotNull();

            List<com.school.sis.grade.dto.AcademicRecordResponse> records = gradeService.academicRecords(student.getId());
            assertThat(records).isNotNull();
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }


    @Test
    void facultyWithNullFacultyIdIsDeniedAccess() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        SisUserDetails principal = mock(SisUserDetails.class);
        when(principal.id()).thenReturn(UUID.randomUUID());
        when(principal.facultyId()).thenReturn(null); // NULL faculty ID
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("GRADE_ENCODE"),
                new SimpleGrantedAuthority("ROLE_FACULTY")
        );
        doReturn(authorities).when(principal).getAuthorities();

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
        );

        try {
            assertThatThrownBy(() -> gradeService.studentGrades(student.getId()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessage("Faculty user account is not linked to a Faculty record");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    void nonSisUserDetailsPrincipalWithFacultyRoleIsDeniedAccess() {
        ScheduleResponse schedule = confirmedClassWithTwoStudents();
        
        // Mock a standard Spring Security User principal (not SisUserDetails)
        Collection<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("GRADE_ENCODE"),
                new SimpleGrantedAuthority("STUDENT_VIEW"),
                new SimpleGrantedAuthority("ROLE_FACULTY")
        );
        org.springframework.security.core.userdetails.User principal = new org.springframework.security.core.userdetails.User(
                "testfaculty", "password", authorities
        );

        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, authorities)
        );

        try {
            assertThatThrownBy(() -> gradeService.studentGrades(student.getId()))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessage("Access denied: Invalid security principal type for faculty");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }


    private ScheduleResponse confirmedClassWithTwoStudents() {
        ScheduleResponse schedule = schedule(prerequisiteCourse, section, roomOne, DayOfWeek.MONDAY, "09:00", "10:00");
        confirmStudentInSchedule(student, schoolYear, semester, section, schedule);
        confirmStudentInSchedule(otherStudent, schoolYear, semester, section, schedule);
        return schedule;
    }

    private ScheduleResponse confirmedPrerequisiteForStudent(Student targetStudent, String gradeValue, DayOfWeek day, String start, String end) {
        ScheduleResponse schedule = schedule(prerequisiteCourse, section, roomOne, day, start, end);
        confirmStudentInSchedule(targetStudent, schoolYear, semester, section, schedule);
        encodeAll(schedule, gradeValue);
        gradeService.submit(schedule.id(), facultyUser(faculty));
        gradeService.approve(schedule.id(), approverUser());
        return schedule;
    }

    private void encodeAll(ScheduleResponse schedule, String gradeValue) {
        GradeClassResponse classGrades = gradeService.classGrades(schedule.id(), facultyUser(faculty));
        gradeService.encode(schedule.id(), new GradeEncodeRequest(classGrades.grades().stream()
                .map(grade -> new GradeEntryRequest(grade.enrollmentSubjectId(), new BigDecimal(gradeValue), null))
                .toList()), facultyUser(faculty));
    }

    private void confirmStudentInSchedule(Student targetStudent, SchoolYear targetYear, Semester targetSemester, Section targetSection, ScheduleResponse schedule) {
        EnrollmentResponse enrollment = enrollment(targetStudent, targetYear, targetSemester, targetSection);
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id()));
        enrollmentService.confirm(enrollment.id());
    }

    private EnrollmentResponse enrollment(Student targetStudent, SchoolYear targetYear, Semester targetSemester, Section targetSection) {
        return enrollmentService.create(new EnrollmentRequest(targetStudent.getId(), targetYear.getId(), targetSemester.getId(), targetStudent.getYearLevel(), targetSection.getId(), null));
    }

    private ScheduleResponse schedule(Course course, Section targetSection, Room room, DayOfWeek day, String start, String end) {
        return scheduleService.create(new ScheduleRequest(
                targetSection.getId(),
                course.getId(),
                faculty.getId(),
                room.getId(),
                40,
                ScheduleStatus.ACTIVE,
                List.of(new ScheduleMeetingRequest(day, LocalTime.parse(start), LocalTime.parse(end)))
        ));
    }

    private Course course(String code, String title, Department department) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseTitle(title);
        course.setCourseType(CourseType.MAJOR);
        course.setDepartment(department);
        course.setLectureHoursPerWeek(BigDecimal.valueOf(3));
        course.setLaboratoryHoursPerWeek(BigDecimal.ZERO);
        course.setCreditUnits(BigDecimal.valueOf(3));
        course.setStatus(ActiveStatus.ACTIVE);
        return courseRepository.save(course);
    }

    private Faculty faculty(String employeeNumber, String firstName, Department department) {
        Faculty faculty = new Faculty();
        faculty.setEmployeeNumber(employeeNumber);
        faculty.setFirstName(firstName);
        faculty.setLastName("Faculty");
        faculty.setEmail(employeeNumber.toLowerCase() + "@sis.local");
        faculty.setDepartment(department);
        faculty.setEmploymentStatus(EmploymentStatus.FULL_TIME);
        faculty.setFacultyType(FacultyType.INSTRUCTOR);
        faculty.setStatus(ActiveStatus.ACTIVE);
        return facultyRepository.save(faculty);
    }

    private Room room(String code) {
        Room room = new Room();
        room.setRoomCode(code);
        room.setRoomName(code + " Room");
        room.setCapacity(40);
        room.setStatus(ActiveStatus.ACTIVE);
        return roomRepository.save(room);
    }

    private SchoolYear schoolYear(String value) {
        SchoolYear schoolYear = new SchoolYear();
        schoolYear.setSchoolYear(value);
        schoolYear.setActive(true);
        return schoolYearRepository.save(schoolYear);
    }

    private Semester semester(String name, int sortOrder) {
        Semester semester = new Semester();
        semester.setName(name);
        semester.setSortOrder(sortOrder);
        semester.setActive(true);
        return semesterRepository.save(semester);
    }

    private Section section(String code, SchoolYear targetYear, Semester targetSemester) {
        Section section = new Section();
        section.setSectionCode(code);
        section.setProgram(program);
        section.setCurriculum(curriculum);
        section.setSchoolYear(targetYear);
        section.setSemester(targetSemester);
        section.setYearLevel(1);
        section.setStatus(ActiveStatus.ACTIVE);
        return sectionRepository.save(section);
    }

    private Student student(String number, String firstName) {
        Student student = new Student();
        student.setStudentNumber(number);
        student.setFirstName(firstName);
        student.setLastName("Student");
        student.setGender(Gender.OTHER);
        student.setBirthdate(LocalDate.of(2005, 1, 1));
        student.setStatus(StudentStatus.ACTIVE);
        student.setProgram(program);
        student.setCurriculum(curriculum);
        student.setYearLevel(1);
        student.setDateAdmitted(LocalDate.of(2026, 6, 1));
        student.setSchoolYearAdmitted("2026-2027");
        student.setClassification(StudentClassification.IRREGULAR);
        student.setAcademicStatus(AcademicStatus.REGULAR);
        return studentRepository.save(student);
    }

    private CurriculumCourse curriculumCourse(Course course, int sortOrder) {
        CurriculumCourse curriculumCourse = new CurriculumCourse();
        curriculumCourse.setCurriculum(curriculum);
        curriculumCourse.setYearLevel(1);
        curriculumCourse.setSemester(semester.getName());
        curriculumCourse.setCourse(course);
        curriculumCourse.setSortOrder(sortOrder);
        curriculumCourse.setRequiredStatus(RequiredStatus.REQUIRED);
        return curriculumCourseRepository.save(curriculumCourse);
    }

    private SisUserDetails facultyUser(Faculty userFaculty) {
        SisUserDetails userDetails = mock(SisUserDetails.class);
        when(userDetails.id()).thenReturn(UUID.randomUUID());
        when(userDetails.facultyId()).thenReturn(userFaculty.getId());
        Collection<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("GRADE_ENCODE"));
        doReturn(authorities).when(userDetails).getAuthorities();
        return userDetails;
    }

    private SisUserDetails approverUser() {
        SisUserDetails userDetails = mock(SisUserDetails.class);
        when(userDetails.id()).thenReturn(UUID.randomUUID());
        when(userDetails.facultyId()).thenReturn(null);
        Collection<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("GRADE_APPROVE"));
        doReturn(authorities).when(userDetails).getAuthorities();
        return userDetails;
    }

    private SisUserDetails authorityUser(String... authorities) {
        SisUserDetails userDetails = mock(SisUserDetails.class);
        when(userDetails.id()).thenReturn(UUID.randomUUID());
        when(userDetails.facultyId()).thenReturn(null);
        doReturn(java.util.Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()).when(userDetails).getAuthorities();
        return userDetails;
    }
}
