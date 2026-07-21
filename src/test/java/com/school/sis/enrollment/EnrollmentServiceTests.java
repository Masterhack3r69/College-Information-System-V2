package com.school.sis.enrollment;

import com.school.sis.academic.entity.StudentCourseCredit;
import com.school.sis.academic.repository.StudentCourseCreditRepository;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.UserRepository;
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
import com.school.sis.enrollment.entity.EnrollmentStatus;
import com.school.sis.enrollment.entity.EnrollmentSubjectStatus;
import com.school.sis.enrollment.repository.EnrollmentStatusHistoryRepository;
import com.school.sis.enrollment.service.EnrollmentService;
import com.school.sis.schedule.dto.ScheduleMeetingRequest;
import com.school.sis.schedule.dto.ScheduleRequest;
import com.school.sis.schedule.dto.ScheduleLifecycleRequest;
import com.school.sis.schedule.dto.ScheduleResponse;
import com.school.sis.schedule.entity.ScheduleStatus;
import com.school.sis.schedule.repository.ClassScheduleRepository;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
class EnrollmentServiceTests {

    private final EnrollmentService enrollmentService;
    private final ScheduleService scheduleService;
    private final EnrollmentStatusHistoryRepository statusHistoryRepository;
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
    private final StudentCourseCreditRepository studentCourseCreditRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbc;
    private final ClassScheduleRepository classScheduleRepository;

    private Program program;
    private Course courseOne;
    private Course courseTwo;
    private Course courseThree;
    private Course outsideCourse;
    private Faculty facultyOne;
    private Faculty facultyTwo;
    private Faculty facultyThree;
    private Room roomOne;
    private Room roomTwo;
    private Room roomThree;
    private SchoolYear schoolYear;
    private Semester semester;
    private Semester otherSemester;
    private Section sectionA;
    private Section sectionB;
    private Student student;
    private Curriculum curriculum;

    @Autowired
    EnrollmentServiceTests(
            EnrollmentService enrollmentService,
            ScheduleService scheduleService,
            EnrollmentStatusHistoryRepository statusHistoryRepository,
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
            StudentRepository studentRepository,
            StudentCourseCreditRepository studentCourseCreditRepository,
            UserRepository userRepository,
            JdbcTemplate jdbc,
            ClassScheduleRepository classScheduleRepository
    ) {
        this.enrollmentService = enrollmentService;
        this.scheduleService = scheduleService;
        this.statusHistoryRepository = statusHistoryRepository;
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
        this.studentCourseCreditRepository = studentCourseCreditRepository;
        this.userRepository = userRepository;
        this.jdbc = jdbc;
        this.classScheduleRepository = classScheduleRepository;
    }

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        Department department = new Department();
        department.setDepartmentCode("CCS-" + suffix);
        department.setDepartmentName("College of Computer Studies " + suffix);
        department.setStatus(ActiveStatus.ACTIVE);
        department = departmentRepository.save(department);

        program = new Program();
        program.setProgramCode("BSIT-" + suffix);
        program.setProgramName("Bachelor of Science in Information Technology");
        program.setDepartment(department);
        program.setDegreeType(DegreeType.BACHELOR);
        program.setProgramDuration(4);
        program.setStatus(ActiveStatus.ACTIVE);
        program = programRepository.save(program);

        courseOne = course("CCS101-" + suffix, "Intro to Computing", department);
        courseTwo = course("CCS102-" + suffix, "Programming", department);
        courseThree = course("CCS103-" + suffix, "Discrete Math", department);
        outsideCourse = course("OUT-" + suffix, "Outside Course", department);

        facultyOne = faculty("EMP-A-" + suffix, "Ada", "Lovelace", department);
        facultyTwo = faculty("EMP-B-" + suffix, "Grace", "Hopper", department);
        facultyThree = faculty("EMP-C-" + suffix, "Alan", "Turing", department);
        roomOne = room("LAB-A-" + suffix);
        roomTwo = room("LAB-B-" + suffix);
        roomThree = room("LAB-C-" + suffix);

        schoolYear = new SchoolYear();
        schoolYear.setSchoolYear("2026-" + suffix);
        schoolYear.setActive(true);
        schoolYear = schoolYearRepository.save(schoolYear);

        semester = semester("TERM" + suffix, 1);
        otherSemester = semester("OTHER" + suffix, 2);

        curriculum = new Curriculum();
        curriculum.setProgram(program);
        curriculum.setCurriculumCode("CUR-" + suffix);
        curriculum.setCurriculumName("BSIT Curriculum");
        curriculum.setEffectiveSchoolYear("2026-2027");
        curriculum.setVersion("1");
        curriculum.setStatus(CurriculumStatus.ACTIVE);
        curriculum = curriculumRepository.save(curriculum);
        curriculumCourse(curriculum, courseOne, 1);
        curriculumCourse(curriculum, courseTwo, 2);
        curriculumCourse(curriculum, courseThree, 3);

        sectionA = section("BSIT-1A-" + suffix, semester);
        sectionB = section("BSIT-1B-" + suffix, semester);

        student = new Student();
        student.setStudentNumber("S-" + suffix);
        student.setFirstName("Test");
        student.setLastName("Student");
        student.setGender(Gender.OTHER);
        student.setBirthdate(LocalDate.of(2005, 1, 1));
        student.setStatus(StudentStatus.ACTIVE);
        student.setProgram(program);
        student.setCurriculum(curriculum);
        student.setYearLevel(1);
        student.setDateAdmitted(LocalDate.of(2026, 6, 1));
        student.setSchoolYearAdmitted("2026-2027");
        student.setClassification(StudentClassification.REGULAR);
        student.setAcademicStatus(AcademicStatus.REGULAR);
        student = studentRepository.save(student);
    }

    @Test
    void createsDraftEnrollment() {
        EnrollmentResponse response = enrollmentService.create(enrollmentRequest(sectionA.getId()));

        assertThat(response.status()).isEqualTo(EnrollmentStatus.DRAFT);
        assertThat(response.studentId()).isEqualTo(student.getId());
        assertThat(response.sectionId()).isEqualTo(sectionA.getId());
        assertThat(response.subjectCount()).isZero();
        assertThat(response.validation().valid()).isFalse();
    }

    @Test
    void rejectsInactiveSection() {
        Section inactiveSection = section("BSIT-INACTIVE-" + UUID.randomUUID().toString().substring(0, 8), semester);
        inactiveSection.setStatus(ActiveStatus.INACTIVE);
        inactiveSection = sectionRepository.save(inactiveSection);

        final UUID inactiveSectionId = inactiveSection.getId();
        assertThatThrownBy(() -> enrollmentService.create(enrollmentRequest(inactiveSectionId)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Selected section is inactive");
    }

    @Test
    void rejectsDuplicateActiveEnrollmentForSameTerm() {
        enrollmentService.create(enrollmentRequest(sectionA.getId()));

        assertThatThrownBy(() -> enrollmentService.create(enrollmentRequest(sectionA.getId())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Student already has an active enrollment for this term");
    }

    @Test
    void addsValidActiveSchedule() {
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(sectionA.getId()));
        ScheduleResponse schedule = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.MONDAY, "09:00", "10:00");

        EnrollmentResponse updated = enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id()));

        assertThat(updated.subjectCount()).isEqualTo(1);
        assertThat(updated.totalCreditUnits()).isEqualByComparingTo("3");
        assertThat(updated.subjects().getFirst().status()).isEqualTo(EnrollmentSubjectStatus.ENROLLED);
    }

    @Test
    void rejectsDuplicateSubject() {
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(sectionA.getId()));
        ScheduleResponse schedule = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.MONDAY, "09:00", "10:00");
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id()));

        assertThatThrownBy(() -> enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Schedule is already selected for this enrollment");
    }

    @Test
    void rejectsNonCurriculumSchedule() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(null));

        Curriculum outsideCurriculum = new Curriculum();
        outsideCurriculum.setProgram(program);
        outsideCurriculum.setCurriculumCode("OUT-CUR-" + UUID.randomUUID().toString().substring(0, 8));
        outsideCurriculum.setCurriculumName("Outside Curriculum");
        outsideCurriculum.setEffectiveSchoolYear("2026-2027");
        outsideCurriculum.setVersion("1");
        outsideCurriculum.setStatus(CurriculumStatus.ACTIVE);
        outsideCurriculum = curriculumRepository.save(outsideCurriculum);

        CurriculumCourse cc = new CurriculumCourse();
        cc.setCurriculum(outsideCurriculum);
        cc.setYearLevel(1);
        cc.setSemester(semester.getName());
        cc.setCourse(outsideCourse);
        cc.setSortOrder(1);
        cc.setRequiredStatus(RequiredStatus.REQUIRED);
        curriculumCourseRepository.save(cc);

        Section outsideSection = new Section();
        outsideSection.setSectionCode("OUT-SEC-" + UUID.randomUUID().toString().substring(0, 6));
        outsideSection.setProgram(program);
        outsideSection.setCurriculum(outsideCurriculum);
        outsideSection.setSchoolYear(schoolYear);
        outsideSection.setSemester(semester);
        outsideSection.setYearLevel(1);
        outsideSection.setMaximumCapacity(40);
        outsideSection.setStatus(ActiveStatus.ACTIVE);
        outsideSection = sectionRepository.save(outsideSection);

        ScheduleResponse schedule = schedule(outsideCourse, outsideSection, facultyOne, roomOne, DayOfWeek.MONDAY, "09:00", "10:00");

        assertThatThrownBy(() -> enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Schedule course is not part of the student's curriculum");
    }

    @Test
    void rejectsScheduleTermMismatch() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(null));

        CurriculumCourse cc = new CurriculumCourse();
        cc.setCurriculum(curriculum);
        cc.setYearLevel(1);
        cc.setSemester(otherSemester.getName());
        cc.setCourse(courseOne);
        cc.setSortOrder(4);
        cc.setRequiredStatus(RequiredStatus.REQUIRED);
        curriculumCourseRepository.save(cc);

        Section otherTermSection = section("BSIT-OT-" + UUID.randomUUID().toString().substring(0, 6), otherSemester);
        ScheduleResponse schedule = schedule(courseOne, otherTermSection, facultyOne, roomOne, DayOfWeek.MONDAY, "09:00", "10:00");

        assertThatThrownBy(() -> enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Schedule term must match enrollment term");
    }

    @Test
    void rejectsConflictingSelectedSchedules() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(null));
        ScheduleResponse first = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.MONDAY, "09:00", "10:30");
        ScheduleResponse second = schedule(courseTwo, sectionB, facultyTwo, roomTwo, DayOfWeek.MONDAY, "10:00", "11:00");
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(first.id()));

        assertThatThrownBy(() -> enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(second.id())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Selected schedule conflicts with another enrolled subject");
    }

    @Test
    void allowsBackToBackSelectedSchedules() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(null));
        ScheduleResponse first = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.TUESDAY, "09:00", "10:00");
        ScheduleResponse second = schedule(courseTwo, sectionB, facultyTwo, roomTwo, DayOfWeek.TUESDAY, "10:00", "11:00");

        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(first.id()));
        EnrollmentResponse updated = enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(second.id()));

        assertThat(updated.subjectCount()).isEqualTo(2);
        assertThat(updated.validation().valid()).isTrue();
    }

    @Test
    void droppedSubjectIsExcludedFromTotalsAndValidation() {
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(sectionA.getId()));
        ScheduleResponse schedule = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.WEDNESDAY, "09:00", "10:00");
        EnrollmentResponse withSubject = enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id()));

        EnrollmentResponse dropped = enrollmentService.dropSubject(enrollment.id(), withSubject.subjects().getFirst().id());

        assertThat(dropped.subjectCount()).isZero();
        assertThat(dropped.totalCreditUnits()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(dropped.validation().valid()).isFalse();
        assertThat(dropped.validation().blockingIssues()).extracting("code").contains("NO_SUBJECTS");
    }

    @Test
    void confirmValidEnrollmentRecordsStatusHistoryAndLocksEnrollment() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(sectionA.getId()));
        ScheduleResponse schedule = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.THURSDAY, "09:00", "10:00");
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id()));

        EnrollmentResponse confirmed = enrollmentService.confirm(enrollment.id());

        assertThat(confirmed.status()).isEqualTo(EnrollmentStatus.CONFIRMED);
        assertThat(statusHistoryRepository.findByEnrollmentIdOrderByChangedAtAsc(enrollment.id())).hasSize(2);
        assertThatThrownBy(() -> enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Only draft enrollments can be modified");
    }

    @Test
    void cancelRecordsStatusHistory() {
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(sectionA.getId()));

        EnrollmentResponse cancelled = enrollmentService.cancel(enrollment.id(), "Reason");

        assertThat(cancelled.status()).isEqualTo(EnrollmentStatus.CANCELLED);
        assertThat(statusHistoryRepository.findByEnrollmentIdOrderByChangedAtAsc(enrollment.id())).hasSize(2);
    }

    @Test
    void validateDoesNotWarnWhenNoPrerequisitesExist() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(sectionA.getId()));
        ScheduleResponse schedule = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.FRIDAY, "09:00", "10:00");
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id()));

        EnrollmentValidationResponse validation = enrollmentService.validate(enrollment.id());

        assertThat(validation.valid()).isTrue();
        assertThat(validation.warnings()).isEmpty();
    }

    private EnrollmentRequest enrollmentRequest(UUID sectionId) {
        return new EnrollmentRequest(student.getId(), schoolYear.getId(), semester.getId(), student.getYearLevel(), sectionId, "Test enrollment");
    }

    private ScheduleResponse schedule(Course course, Section section, Faculty faculty, Room room, DayOfWeek day, String start, String end) {
        ScheduleResponse draft = scheduleService.create(new ScheduleRequest(
                section.getId(),
                course.getId(),
                faculty.getId(),
                room.getId(),
                40,
                ScheduleStatus.DRAFT,
                List.of(new ScheduleMeetingRequest(day, LocalTime.parse(start), LocalTime.parse(end)))
        ));
        return scheduleService.activate(draft.id(),
                new ScheduleLifecycleRequest(draft.version(), null, false, List.of()), null);
    }

    private Course course(String code, String title, Department department) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseTitle(title);
        course.setCourseType(CourseType.MAJOR);
        course.setDepartment(department);
        course.setLectureHoursPerWeek(BigDecimal.valueOf(2));
        course.setLaboratoryHoursPerWeek(BigDecimal.valueOf(3));
        course.setCreditUnits(BigDecimal.valueOf(3));
        course.setStatus(ActiveStatus.ACTIVE);
        return courseRepository.save(course);
    }

    private Faculty faculty(String employeeNumber, String firstName, String lastName, Department department) {
        Faculty faculty = new Faculty();
        faculty.setEmployeeNumber(employeeNumber);
        faculty.setFirstName(firstName);
        faculty.setLastName(lastName);
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
        room.setRoomType("GENERAL");
        room.setStatus(ActiveStatus.ACTIVE);
        return roomRepository.save(room);
    }

    private Semester semester(String name, int sortOrder) {
        Semester semester = new Semester();
        semester.setName(name);
        semester.setSortOrder(sortOrder);
        semester.setActive(true);
        return semesterRepository.save(semester);
    }

    private Section section(String code, Semester semester) {
        Section section = new Section();
        section.setSectionCode(code);
        section.setProgram(program);
        section.setCurriculum(curriculum);
        section.setSchoolYear(schoolYear);
        section.setSemester(semester);
        section.setYearLevel(1);
        section.setMaximumCapacity(40);
        section.setStatus(ActiveStatus.ACTIVE);
        return sectionRepository.save(section);
    }

    private void curriculumCourse(Curriculum curriculum, Course course, int sortOrder) {
        CurriculumCourse curriculumCourse = new CurriculumCourse();
        curriculumCourse.setCurriculum(curriculum);
        curriculumCourse.setYearLevel(1);
        curriculumCourse.setSemester(semester.getName());
        curriculumCourse.setCourse(course);
        curriculumCourse.setSortOrder(sortOrder);
        curriculumCourse.setRequiredStatus(RequiredStatus.REQUIRED);
        curriculumCourseRepository.save(curriculumCourse);
    }

    @Test
    void testMixedSectionDesignationForFlexibleStudent() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        EnrollmentResponse response = enrollmentService.create(new EnrollmentRequest(
                student.getId(), schoolYear.getId(), semester.getId(), 1, null, "Mixed section test"));

        assertThat(response.sectionCode()).startsWith("MIXED-");
        assertThat(response.sectionCode()).contains(student.getProgram().getProgramCode());

        student.setClassification(StudentClassification.REGULAR);
        studentRepository.save(student);
        assertThatThrownBy(() -> enrollmentService.create(new EnrollmentRequest(
                student.getId(), schoolYear.getId(), semester.getId(), 1, null, "Regular student fails")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Section is required for this student classification");
    }

    @Test
    void testDraftAutoPopulationForRegularStudent() {
        ScheduleResponse sch1 = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.MONDAY, "08:00", "09:00");
        ScheduleResponse sch2 = schedule(courseTwo, sectionA, facultyTwo, roomTwo, DayOfWeek.MONDAY, "09:00", "10:00");

        EnrollmentResponse response = enrollmentService.create(enrollmentRequest(sectionA.getId()));

        assertThat(response.subjectCount()).isEqualTo(2);
        assertThat(response.subjects()).extracting("courseCode")
                .containsExactlyInAnyOrder(courseOne.getCourseCode(), courseTwo.getCourseCode());
    }

    @Test
    void testCompletenessValidationForRegularStudent() {
        ScheduleResponse sch1 = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.MONDAY, "08:00", "09:00");

        EnrollmentResponse response = enrollmentService.create(enrollmentRequest(sectionA.getId()));

        assertThat(response.validation().valid()).isFalse();
        assertThat(response.validation().blockingIssues()).extracting("code")
                .contains("REQUIRED_COURSE_MISSING");
    }

    @Test
    void optionalAndElectiveCoursesRemainSelectableButAreNotMandatory() {
        CurriculumCourse optional = curriculumCourseFor(courseThree);
        optional.setRequiredStatus(RequiredStatus.OPTIONAL);
        curriculumCourseRepository.save(optional);
        schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.MONDAY, "08:00", "09:00");
        schedule(courseTwo, sectionA, facultyTwo, roomTwo, DayOfWeek.MONDAY, "09:00", "10:00");

        EnrollmentResponse response = enrollmentService.create(enrollmentRequest(sectionA.getId()));

        assertThat(response.validation().valid()).isTrue();
        assertThat(response.subjects()).extracting("courseCode")
                .containsExactlyInAnyOrder(courseOne.getCourseCode(), courseTwo.getCourseCode());
    }

    @Test
    void rejectsSameCourseAcrossDifferentSchedules() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(null));
        ScheduleResponse first = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.MONDAY, "08:00", "09:00");
        ScheduleResponse second = schedule(courseOne, sectionB, facultyTwo, roomTwo, DayOfWeek.TUESDAY, "08:00", "09:00");
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(first.id()));

        assertThatThrownBy(() -> enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(second.id())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("The same course cannot be selected in multiple schedules");
    }

    @Test
    void transfereeCanEnrollLowerYearBackSubject() {
        student.setClassification(StudentClassification.TRANSFEREE);
        student.setYearLevel(2);
        studentRepository.save(student);
        EnrollmentResponse enrollment = enrollmentService.create(new EnrollmentRequest(
                student.getId(), schoolYear.getId(), semester.getId(), 2, null, "Back subject"));
        ScheduleResponse lowerYear = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.WEDNESDAY, "08:00", "09:00");

        EnrollmentResponse updated = enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(lowerYear.id()));

        assertThat(updated.subjects()).extracting("courseCode").containsExactly(courseOne.getCourseCode());
        assertThat(updated.validation().valid()).isTrue();
    }

    @Test
    void corequisiteMustBeSatisfiedOrSelectedConcurrently() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        CurriculumCourse programming = curriculumCourseFor(courseTwo);
        programming.setCorequisites(new LinkedHashSet<>(Set.of(courseOne)));
        curriculumCourseRepository.save(programming);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(null));
        ScheduleResponse programmingSchedule = schedule(courseTwo, sectionA, facultyTwo, roomTwo, DayOfWeek.MONDAY, "10:00", "11:00");
        ScheduleResponse corequisiteSchedule = schedule(courseOne, sectionB, facultyOne, roomOne, DayOfWeek.TUESDAY, "10:00", "11:00");

        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(programmingSchedule.id()));
        assertThat(enrollmentService.validate(enrollment.id()).blockingIssues()).extracting("code")
                .contains("COREQUISITE_NOT_SATISFIED");
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(corequisiteSchedule.id()));
        assertThat(enrollmentService.validate(enrollment.id()).valid()).isTrue();
    }

    @Test
    void approvedCreditSatisfiesPrerequisiteWithoutCreatingInternalGrade() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        CurriculumCourse programming = curriculumCourseFor(courseTwo);
        programming.setPrerequisites(new LinkedHashSet<>(Set.of(courseOne)));
        curriculumCourseRepository.save(programming);
        User registrar = new User();
        registrar.setEmail("registrar-" + UUID.randomUUID() + "@sis.local");
        registrar.setUsername("registrar-" + UUID.randomUUID());
        registrar.setPasswordHash("hash");
        registrar.setFullName("Test Registrar");
        registrar.setActive(true);
        registrar = userRepository.save(registrar);
        StudentCourseCredit credit = new StudentCourseCredit();
        credit.setStudent(student);
        credit.setTargetCourse(courseOne);
        credit.setEvaluationCaseId(UUID.randomUUID());
        credit.setEvaluationMatchId(UUID.randomUUID());
        credit.setCreditedUnits(courseOne.getCreditUnits());
        credit.setSourceLabel("Approved transfer equivalency");
        credit.setPostedBy(registrar);
        studentCourseCreditRepository.save(credit);
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(null));
        ScheduleResponse schedule = schedule(courseTwo, sectionA, facultyTwo, roomTwo, DayOfWeek.THURSDAY, "10:00", "11:00");

        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(schedule.id()));

        assertThat(enrollmentService.validate(enrollment.id()).valid()).isTrue();
    }

    @Test
    void probationEnrollmentFailsClosedWithoutConfiguredPolicy() {
        student.setAcademicStatus(AcademicStatus.PROBATION);
        studentRepository.save(student);

        assertThatThrownBy(() -> enrollmentService.create(enrollmentRequest(sectionA.getId())))
                .isInstanceOf(BusinessRuleException.class)
                .extracting(error -> ((BusinessRuleException) error).getCode())
                .isEqualTo("ACADEMIC_POLICY_NOT_CONFIGURED");
    }

    @Test
    void probationPolicyMaximumUnitsAppearsAsBlockingValidation() {
        student.setAcademicStatus(AcademicStatus.PROBATION);
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        User registrar = testUser();
        userRepository.flush();
        jdbc.update("""
                insert into enrollment_eligibility_policies(id,academic_status,school_year_id,program_id,
                enrollment_allowed,maximum_units,requires_approval,active,created_by,created_at,updated_at)
                values(?,?,?,?,?,?,?,?,?,current_timestamp,current_timestamp)
                """, UUID.randomUUID(), "PROBATION", schoolYear.getId(), program.getId(), true,
                BigDecimal.valueOf(3), true, true, registrar.getId());
        EnrollmentResponse enrollment = enrollmentService.create(enrollmentRequest(null));
        ScheduleResponse first = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.MONDAY, "08:00", "09:00");
        ScheduleResponse second = schedule(courseTwo, sectionB, facultyTwo, roomTwo, DayOfWeek.TUESDAY, "08:00", "09:00");
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(first.id()));

        EnrollmentResponse overLimit = enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(second.id()));

        assertThat(overLimit.validation().blockingIssues()).extracting("code").contains("ACADEMIC_UNIT_LIMIT_EXCEEDED");
    }

    @Test
    void finalSeatCanBeConfirmedByOnlyOneEnrollment() {
        student.setClassification(StudentClassification.IRREGULAR);
        studentRepository.save(student);
        Student secondStudent = new Student();
        secondStudent.setStudentNumber("SECOND-" + UUID.randomUUID());
        secondStudent.setFirstName("Second");
        secondStudent.setLastName("Student");
        secondStudent.setGender(Gender.OTHER);
        secondStudent.setBirthdate(LocalDate.of(2004, 1, 1));
        secondStudent.setStatus(StudentStatus.ACTIVE);
        secondStudent.setProgram(program);
        secondStudent.setCurriculum(curriculum);
        secondStudent.setYearLevel(1);
        secondStudent.setDateAdmitted(LocalDate.of(2026, 6, 1));
        secondStudent.setSchoolYearAdmitted("2026-2027");
        secondStudent.setClassification(StudentClassification.IRREGULAR);
        secondStudent.setAcademicStatus(AcademicStatus.REGULAR);
        secondStudent = studentRepository.save(secondStudent);
        ScheduleResponse schedule = schedule(courseOne, sectionA, facultyOne, roomOne, DayOfWeek.FRIDAY, "13:00", "14:00");
        var scheduleEntity = classScheduleRepository.findById(schedule.id()).orElseThrow();
        scheduleEntity.setCapacity(1);
        classScheduleRepository.save(scheduleEntity);
        EnrollmentResponse first = enrollmentService.create(enrollmentRequest(null));
        EnrollmentResponse second = enrollmentService.create(new EnrollmentRequest(secondStudent.getId(), schoolYear.getId(),
                semester.getId(), 1, null, "Competing final seat"));
        enrollmentService.addSubject(first.id(), new EnrollmentSubjectRequest(schedule.id()));
        enrollmentService.addSubject(second.id(), new EnrollmentSubjectRequest(schedule.id()));

        enrollmentService.confirm(first.id());

        assertThatThrownBy(() -> enrollmentService.confirm(second.id()))
                .isInstanceOf(BusinessRuleException.class)
                .extracting(error -> ((BusinessRuleException) error).getCode())
                .isEqualTo("ENROLLMENT_VALIDATION_FAILED");
        assertThat(enrollmentService.validate(second.id()).blockingIssues()).extracting("code").contains("NO_AVAILABLE_SEATS");
    }

    private User testUser() {
        User user = new User();
        user.setEmail("registrar-" + UUID.randomUUID() + "@sis.local");
        user.setUsername("registrar-" + UUID.randomUUID());
        user.setPasswordHash("hash");
        user.setFullName("Test Registrar");
        user.setActive(true);
        return userRepository.save(user);
    }

    private CurriculumCourse curriculumCourseFor(Course course) {
        return curriculumCourseRepository.findByCurriculumIdOrderByYearLevelAscSemesterAscSortOrderAsc(curriculum.getId()).stream()
                .filter(item -> item.getCourse().getId().equals(course.getId())).findFirst().orElseThrow();
    }
}
