package com.school.sis.fee;

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
import com.school.sis.enrollment.entity.EnrollmentStatus;
import com.school.sis.enrollment.service.EnrollmentService;
import com.school.sis.fee.dto.AssessmentResponse;
import com.school.sis.fee.dto.FinanceRequests;
import com.school.sis.fee.dto.FeeItemRequest;
import com.school.sis.fee.dto.FeeRuleRequest;
import com.school.sis.fee.entity.AssessmentStatus;
import com.school.sis.fee.entity.FeeCategory;
import com.school.sis.fee.entity.FeeComputationType;
import com.school.sis.fee.service.AssessmentService;
import com.school.sis.fee.service.FeeService;
import com.school.sis.fee.service.PaymentService;
import com.school.sis.fee.service.FinanceOperationsService;
import com.school.sis.fee.dto.PaymentRequest;
import com.school.sis.fee.entity.PaymentMethod;
import com.school.sis.fee.entity.PaymentStatus;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.auth.security.SisUserDetails;
import com.school.sis.schedule.dto.ScheduleMeetingRequest;
import com.school.sis.schedule.dto.ScheduleRequest;
import com.school.sis.schedule.dto.ScheduleLifecycleRequest;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
@Sql("/finance-test-schema.sql")
class FeeAssessmentServiceTests {

    private final FeeService feeService;
    private final AssessmentService assessmentService;
    private final EnrollmentService enrollmentService;
    private final ScheduleService scheduleService;
    private final PaymentService paymentService;
    private final FinanceOperationsService financeOperations;
    private final UserRepository userRepository;
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
    private Course labCourse;
    private Course lectureCourse;
    private Faculty faculty;
    private Room roomOne;
    private Room roomTwo;
    private SchoolYear schoolYear;
    private Semester semester;
    private Section section;
    private Student student;
    private SisUserDetails cashier;
    private SisUserDetails manager;

    @Autowired
    FeeAssessmentServiceTests(
            FeeService feeService,
            AssessmentService assessmentService,
            EnrollmentService enrollmentService,
            ScheduleService scheduleService,
            PaymentService paymentService,
            FinanceOperationsService financeOperations,
            UserRepository userRepository,
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
        this.feeService = feeService;
        this.assessmentService = assessmentService;
        this.enrollmentService = enrollmentService;
        this.scheduleService = scheduleService;
        this.paymentService = paymentService;
        this.financeOperations = financeOperations;
        this.userRepository = userRepository;
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
        department.setDepartmentCode("FEE-CCS-" + suffix);
        department.setDepartmentName("Fee Test Department " + suffix);
        department.setStatus(ActiveStatus.ACTIVE);
        department = departmentRepository.save(department);

        program = new Program();
        program.setProgramCode("FEE-BSIT-" + suffix);
        program.setProgramName("Fee Test Program");
        program.setDepartment(department);
        program.setDegreeType(DegreeType.BACHELOR);
        program.setProgramDuration(4);
        program.setStatus(ActiveStatus.ACTIVE);
        program = programRepository.save(program);

        labCourse = course("FEE-LAB-" + suffix, "Lab Course", department, "3", "3");
        lectureCourse = course("FEE-LEC-" + suffix, "Lecture Course", department, "3", "0");

        faculty = new Faculty();
        faculty.setEmployeeNumber("FEE-EMP-" + suffix);
        faculty.setFirstName("Fee");
        faculty.setLastName("Faculty");
        faculty.setEmail("fee-" + suffix + "@sis.local");
        faculty.setDepartment(department);
        faculty.setEmploymentStatus(EmploymentStatus.FULL_TIME);
        faculty.setFacultyType(FacultyType.INSTRUCTOR);
        faculty.setStatus(ActiveStatus.ACTIVE);
        faculty = facultyRepository.save(faculty);

        roomOne = room("FEE-R1-" + suffix);
        roomTwo = room("FEE-R2-" + suffix);

        schoolYear = new SchoolYear();
        schoolYear.setSchoolYear("FEE-2026-" + suffix);
        schoolYear.setActive(true);
        schoolYear = schoolYearRepository.save(schoolYear);

        semester = new Semester();
        semester.setName("FEETERM" + suffix);
        semester.setSortOrder(1);
        semester.setActive(true);
        semester = semesterRepository.save(semester);

        Curriculum curriculum = new Curriculum();
        curriculum.setProgram(program);
        curriculum.setCurriculumCode("FEE-CUR-" + suffix);
        curriculum.setCurriculumName("Fee Curriculum");
        curriculum.setEffectiveSchoolYear("2026-2027");
        curriculum.setVersion("1");
        curriculum.setStatus(CurriculumStatus.ACTIVE);
        curriculum = curriculumRepository.save(curriculum);
        curriculumCourse(curriculum, labCourse, 1);
        curriculumCourse(curriculum, lectureCourse, 2);

        section = new Section();
        section.setSectionCode("FEE-1A-" + suffix);
        section.setProgram(program);
        section.setCurriculum(curriculum);
        section.setSchoolYear(schoolYear);
        section.setSemester(semester);
        section.setYearLevel(1);
        section.setMaximumCapacity(40);
        section.setStatus(ActiveStatus.ACTIVE);
        section = sectionRepository.save(section);

        student = new Student();
        student.setStudentNumber("FEE-S-" + suffix);
        student.setFirstName("Fee");
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

        User cashierUser = new User();
        cashierUser.setUsername("cashier-" + suffix);
        cashierUser.setEmail("cashier-" + suffix + "@sis.local");
        cashierUser.setPasswordHash("unused");
        cashierUser.setFullName("Test Cashier");
        cashierUser.setActive(true);
        cashier = new SisUserDetails(userRepository.save(cashierUser));

        User managerUser = new User();
        managerUser.setUsername("finance-manager-" + suffix);
        managerUser.setEmail("finance-manager-" + suffix + "@sis.local");
        managerUser.setPasswordHash("unused");
        managerUser.setFullName("Test Finance Manager");
        managerUser.setActive(true);
        manager = new SisUserDetails(userRepository.saveAndFlush(managerUser));

        var series = financeOperations.createReceiptSeries(
                new FinanceRequests.ReceiptSeries("T" + suffix, 1, 999, 6, cashier.id()), manager);
        financeOperations.openSession(new FinanceRequests.SessionOpen((UUID) series.get("id"), LocalDate.now()), cashier);
    }

    @Test
    void generatesAssessmentFromApplicableFeeRules() {
        createFee("TUITION", FeeCategory.TUITION, FeeComputationType.PER_UNIT, "100");
        createFee("LAB", FeeCategory.LABORATORY, FeeComputationType.PER_LABORATORY_SUBJECT, "500");
        createFee("MISC", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "1000");
        EnrollmentResponse enrollment = enrollmentWithTwoSubjects();

        AssessmentResponse assessment = assessmentService.generate(enrollment.id());

        assertThat(assessment.totalUnits()).isEqualByComparingTo("6");
        assertThat(assessment.tuitionAmount()).isEqualByComparingTo("600");
        assertThat(assessment.laboratoryFeeAmount()).isEqualByComparingTo("500");
        assertThat(assessment.miscellaneousFeeAmount()).isEqualByComparingTo("1000");
        assertThat(assessment.totalAssessment()).isEqualByComparingTo("2100");
        assertThat(assessment.balance()).isEqualByComparingTo("2100");
        assertThat(assessment.items()).hasSize(3);
    }

    @Test
    void ignoresInactiveAndNonMatchingRules() {
        createFee("ACTIVE", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "300");
        createFee("INACTIVE", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "999", ActiveStatus.INACTIVE, 1);
        createFee("WRONG_YEAR", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "999", ActiveStatus.ACTIVE, 2);
        EnrollmentResponse enrollment = enrollmentWithTwoSubjects();

        AssessmentResponse assessment = assessmentService.generate(enrollment.id());

        assertThat(assessment.totalAssessment()).isEqualByComparingTo("300");
        assertThat(assessment.items()).extracting("feeCode").containsExactly("ACTIVE");
    }

    @Test
    void rejectsDuplicateAssessmentForEnrollment() {
        createFee("MISC-DUP", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "100");
        EnrollmentResponse enrollment = enrollmentWithTwoSubjects();
        assessmentService.generate(enrollment.id());

        assertThatThrownBy(() -> assessmentService.generate(enrollment.id()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Assessment already exists for this enrollment");
    }

    @Test
    void recalculatesUnpaidAssessmentFromCurrentFeeRules() {
        createFee("MISC-OLD", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "100");
        EnrollmentResponse enrollment = enrollmentWithTwoSubjects();
        AssessmentResponse original = assessmentService.generate(enrollment.id());
        createFee("MISC-NEW", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "250");

        AssessmentResponse recalculated = assessmentService.recalculate(original.id());

        assertThat(recalculated.totalAssessment()).isEqualByComparingTo("350");
        assertThat(recalculated.items()).hasSize(2);
    }

    @Test
    void blocksRecalculationAfterPayment() {
        createFee("MISC-PAID", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "100");
        AssessmentResponse assessment = assessmentService.generate(enrollmentWithTwoSubjects().id());
        paymentService.post(assessment.id(), payment("50", PaymentMethod.CASH), cashier);

        assertThatThrownBy(() -> assessmentService.recalculate(assessment.id()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Only unpaid active assessments can be recalculated");
    }

    @Test
    void rejectsCancelledEnrollmentAssessment() {
        createFee("MISC-CANCEL", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "100");
        EnrollmentResponse enrollment = enrollmentWithTwoSubjects();
        EnrollmentResponse cancelled = enrollmentService.cancel(enrollment.id(), "Reason");

        assertThat(cancelled.status()).isEqualTo(EnrollmentStatus.CANCELLED);
        assertThatThrownBy(() -> assessmentService.generate(enrollment.id()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Only confirmed enrollments can be assessed");
    }

    @Test
    void postsPartialAndFullPaymentsThenVoidsWithoutDeletingHistory() {
        createFee("PAYMENT", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "1000");
        AssessmentResponse assessment = assessmentService.generate(enrollmentWithTwoSubjects().id());

        var first = paymentService.post(assessment.id(), payment("400", PaymentMethod.CASH), cashier);
        AssessmentResponse partial = assessmentService.get(assessment.id());
        assertThat(partial.status()).isEqualTo(AssessmentStatus.PARTIAL);
        assertThat(partial.balance()).isEqualByComparingTo("600");

        var second = paymentService.post(assessment.id(), new PaymentRequest(UUID.randomUUID(), new BigDecimal("600"), PaymentMethod.E_WALLET, "REF-1", null), cashier);
        assertThat(assessmentService.get(assessment.id()).status()).isEqualTo(AssessmentStatus.PAID);

        var voidRequest = financeOperations.requestVoid(second.id(), new FinanceRequests.IdempotentReason(UUID.randomUUID(), "Wrong payment"), cashier);
        financeOperations.decideVoid((UUID) voidRequest.get("id"), new FinanceRequests.Decision(true, "Approved correction"), manager);
        financeOperations.executeVoid((UUID) voidRequest.get("id"), new FinanceRequests.IdempotentReason(UUID.randomUUID(), "Execute approved void"), cashier);
        assertThat(paymentService.list(assessment.id()).stream().filter(p -> p.id().equals(second.id())).findFirst().orElseThrow().status()).isEqualTo(PaymentStatus.VOIDED);
        assertThat(assessmentService.get(assessment.id()).balance()).isEqualByComparingTo("600");
        assertThat(paymentService.list(assessment.id())).hasSize(2);
        assertThat(first.status()).isEqualTo(PaymentStatus.POSTED);
    }

    @Test
    void retriesAreIdempotentAndOverpaymentIsRejected() {
        createFee("PAYMENT-VALIDATION", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "500");
        AssessmentResponse assessment = assessmentService.generate(enrollmentWithTwoSubjects().id());
        UUID requestId = UUID.randomUUID();
        var request = new PaymentRequest(requestId, new BigDecimal("100"), PaymentMethod.CASH, null, null);
        var first = paymentService.post(assessment.id(), request, cashier);
        var retry = paymentService.post(assessment.id(), request, cashier);
        assertThat(retry.id()).isEqualTo(first.id());
        assertThat(paymentService.list(assessment.id())).hasSize(1);
        assertThatThrownBy(() -> paymentService.post(assessment.id(), payment("401", PaymentMethod.CASH), cashier))
                .isInstanceOf(BusinessRuleException.class).hasMessage("Payment cannot exceed the remaining balance");
    }

    @Test
    void approvedDiscountCreatesCreditAndIndependentRefundRestoresPaidState() {
        createFee("REFUND-LIFECYCLE", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "500");
        AssessmentResponse assessment = assessmentService.generate(enrollmentWithTwoSubjects().id());
        paymentService.post(assessment.id(), payment("500", PaymentMethod.CASH), cashier);

        var adjustment = financeOperations.requestAdjustment(assessment.id(),
                new FinanceRequests.Adjustment(UUID.randomUUID(), FinanceRequests.AdjustmentType.DISCOUNT,
                        new BigDecimal("100"), "Approved scholarship"), cashier);
        assertThatThrownBy(() -> financeOperations.decideAdjustment((UUID) adjustment.get("id"),
                new FinanceRequests.Decision(true, "Self approval"), cashier))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("requester cannot approve");
        financeOperations.decideAdjustment((UUID) adjustment.get("id"),
                new FinanceRequests.Decision(true, "Scholarship verified"), manager);
        assertThat(assessmentService.get(assessment.id()).status()).isEqualTo(AssessmentStatus.CREDIT_BALANCE);
        assertThat(assessmentService.get(assessment.id()).creditBalance()).isEqualByComparingTo("100");

        var refund = financeOperations.requestRefund(assessment.id(),
                new FinanceRequests.Refund(UUID.randomUUID(), new BigDecimal("100"), "Return excess collection"), cashier);
        financeOperations.decideRefund((UUID) refund.get("id"), new FinanceRequests.Decision(true, "Credit verified"), manager);
        financeOperations.disburseRefund((UUID) refund.get("id"),
                new FinanceRequests.RefundDisbursement(UUID.randomUUID(), PaymentMethod.CASH, null), cashier);

        AssessmentResponse settled = assessmentService.get(assessment.id());
        assertThat(settled.refundedAmount()).isEqualByComparingTo("100");
        assertThat(settled.netPaidAmount()).isEqualByComparingTo("400");
        assertThat(settled.creditBalance()).isZero();
        assertThat(settled.status()).isEqualTo(AssessmentStatus.PAID);
    }

    @Test
    void installmentSnapshotAllocatesPartialPaymentToOldestLine() {
        createFee("INSTALLMENT", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "1000");
        AssessmentResponse assessment = assessmentService.generate(enrollmentWithTwoSubjects().id());
        var template = financeOperations.saveTemplate(null, new FinanceRequests.Template("Two part " + UUID.randomUUID(),
                schoolYear.getId(), semester.getId(), "ACTIVE", List.of(
                new FinanceRequests.TemplateLine(1, "Enrollment", LocalDate.now().plusDays(7), new BigDecimal("50")),
                new FinanceRequests.TemplateLine(2, "Final", LocalDate.now().plusDays(30), new BigDecimal("50"))
        )), manager);
        financeOperations.assignPlan(assessment.id(), new FinanceRequests.PlanAssignment((UUID) template.get("id"), null), manager);
        paymentService.post(assessment.id(), payment("300", PaymentMethod.CASH), cashier);

        var installments = (List<?>) financeOperations.plan(assessment.id()).get("installments");
        assertThat(installments).hasSize(2);
        assertThat(((Map<?, ?>) installments.getFirst()).get("status")).isEqualTo("PARTIAL");
        assertThat(((BigDecimal) ((Map<?, ?>) installments.getFirst()).get("paidAmount"))).isEqualByComparingTo("300");
    }

    @Test
    void enrollmentCancellationWaitsForResolvedAssessment() {
        createFee("CANCELLATION", FeeCategory.MISCELLANEOUS, FeeComputationType.FIXED_AMOUNT, "300");
        EnrollmentResponse enrollment = enrollmentWithTwoSubjects();
        AssessmentResponse assessment = assessmentService.generate(enrollment.id());
        assertThatThrownBy(() -> enrollmentService.cancel(enrollment.id(), "Registrar request"))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("Finance must resolve");

        var request = financeOperations.requestCancellation(assessment.id(),
                new FinanceRequests.IdempotentReason(UUID.randomUUID(), "Enrollment withdrawn"), cashier);
        financeOperations.decideCancellation((UUID) request.get("id"),
                new FinanceRequests.Decision(true, "Withdrawal verified"), manager);

        assertThat(assessmentService.get(assessment.id()).status()).isEqualTo(AssessmentStatus.CANCELLED);
        assertThat(enrollmentService.cancel(enrollment.id(), "Finance resolved").status()).isEqualTo(EnrollmentStatus.CANCELLED);
    }

    private PaymentRequest payment(String amount, PaymentMethod method) {
        return new PaymentRequest(UUID.randomUUID(), new BigDecimal(amount), method, null, null);
    }

    private EnrollmentResponse enrollmentWithTwoSubjects() {
        EnrollmentResponse enrollment = enrollmentService.create(new EnrollmentRequest(student.getId(), schoolYear.getId(), semester.getId(), student.getYearLevel(), section.getId(), null));
        ScheduleResponse first = schedule(labCourse, roomOne, DayOfWeek.MONDAY, "09:00", "10:00");
        ScheduleResponse second = schedule(lectureCourse, roomTwo, DayOfWeek.TUESDAY, "09:00", "10:00");
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(first.id()));
        enrollmentService.addSubject(enrollment.id(), new EnrollmentSubjectRequest(second.id()));
        return enrollmentService.confirm(enrollment.id());
    }

    private void createFee(String code, FeeCategory category, FeeComputationType computationType, String amount) {
        createFee(code, category, computationType, amount, ActiveStatus.ACTIVE, 1);
    }

    private void createFee(String code, FeeCategory category, FeeComputationType computationType, String amount, ActiveStatus status, int yearLevel) {
        feeService.create(new FeeItemRequest(
                code,
                code + " Fee",
                category,
                null,
                ActiveStatus.ACTIVE,
                List.of(new FeeRuleRequest(null, schoolYear.getId(), semester.getId(), program.getId(), yearLevel, computationType, new BigDecimal(amount), status))
        ));
    }

    private ScheduleResponse schedule(Course course, Room room, DayOfWeek day, String start, String end) {
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

    private Course course(String code, String title, Department department, String units, String labHours) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseTitle(title);
        course.setCourseType(CourseType.MAJOR);
        course.setDepartment(department);
        course.setLectureHoursPerWeek(BigDecimal.valueOf(3));
        course.setLaboratoryHoursPerWeek(new BigDecimal(labHours));
        course.setCreditUnits(new BigDecimal(units));
        course.setStatus(ActiveStatus.ACTIVE);
        return courseRepository.save(course);
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
}
