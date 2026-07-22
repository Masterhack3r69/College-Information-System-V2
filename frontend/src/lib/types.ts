export type ApiResponse<T> = {
  success: boolean
  message: string
  code?: string
  data: T
  errors?: { field: string; message: string }[]
  timestamp: string
}
export type PageResponse<T> = {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export type User = {
  id: string
  username: string
  email: string
  fullName: string
  roles: string[]
  permissions: string[]
  facultyId?: string
  studentId?: string
  passwordChangeRequired: boolean
  availablePortals: Portal[]
  defaultPortal: Portal
}
export type Portal = "ADMIN" | "FACULTY" | "STUDENT"
export type AuthResponse = {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  user: User
}

export type Permission = {
  id: string
  name: string
  description: string
}

export type Role = {
  id: string
  name: string
  description: string
  permissions: Permission[]
  version: number
  protectedRole: boolean
}

export type AdminUser = {
  id: string
  username: string
  email: string
  fullName: string
  active: boolean
  accountType: "SYSTEM" | "FACULTY" | "STUDENT"
  facultyId?: string
  employeeNumber?: string
  facultyName?: string
  facultyEmail?: string
  studentId?: string
  studentNumber?: string
  studentName?: string
  studentEmail?: string
  identitySyncStatus:
    "SYNCED" | "MISMATCH" | "EMAIL_CONFLICT" | "DOMAIN_EMAIL_MISSING"
  mustChangePassword: boolean
  temporaryPasswordExpiresAt?: string
  locked: boolean
  lockedUntil?: string
  lastLoginAt?: string
  activeSessionCount: number
  protectedAccount: boolean
  version: number
  roles: Role[]
  createdAt: string
  updatedAt: string
}

export type UserAccountRequest = {
  username: string
  email: string
  fullName: string
  roleIds: string[]
  facultyId?: string
  version?: number
  auditReason: string
}

export type ProvisionedUser = {
  account: AdminUser
  temporaryPassword: string
  expiresAt: string
}
export type AccountDirectorySummary = {
  total: number
  active: number
  inactive: number
  locked: number
  forcedChange: number
  system: number
  faculty: number
  student: number
}
export type AccountSession = {
  id: string
  current: boolean
  userAgent?: string
  createdIp?: string
  lastIp?: string
  createdAt: string
  lastUsedAt: string
  idleExpiresAt: string
  absoluteExpiresAt: string
  revokedAt?: string
  revokedReason?: string
}
export type IdentityConflict = {
  userId: string
  username: string
  accountType: "FACULTY" | "STUDENT"
  accountName: string
  authoritativeName: string
  accountEmail: string
  authoritativeEmail: string
  conflictingUserId?: string
  status: string
  version: number
}
export type SecurityActivity = {
  id: string
  action: string
  module: string
  entityType?: string
  entityId?: string
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export type FacultyAccountOption = {
  id: string
  employeeNumber: string
  fullName: string
  email: string
  status: ActiveStatus
}
export type Gender = "MALE" | "FEMALE" | "OTHER"

export type StudentStatus =
  | "APPLICANT"
  | "ACTIVE"
  | "ENROLLED"
  | "INACTIVE"
  | "DROPPED"
  | "TRANSFERRED"
  | "GRADUATED"
  | "ARCHIVED"

export type StudentClassification =
  | "REGULAR"
  | "IRREGULAR"
  | "TRANSFEREE"
  | "RETURNEE"
  | "CROSS_ENROLLEE"
  | "GRADUATING"

export type AcademicStatus =
  | "REGULAR"
  | "IRREGULAR"
  | "PROBATION"
  | "CANDIDATE_FOR_GRADUATION"
  | "GRADUATED"
  | "DISMISSED"
  | "ON_LEAVE"

export type AdmissionType =
  | "NEW_STUDENT"
  | "TRANSFEREE"
  | "RETURNEE"
  | "SHIFTEE"
  | "CROSS_ENROLLEE"
  | "SECOND_DEGREE"
  | "CONTINUING_STUDENT"

export type DocumentVerificationStatus =
  "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "MISSING"

export interface StudentPersonalRequest {
  studentNumber: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  gender: Gender
  birthdate: string // LocalDate (YYYY-MM-DD)
  birthplace?: string
  civilStatus?: string
  nationality?: string
  religion?: string
  profilePhotoPath?: string
  status: StudentStatus
}

export interface StudentPersonalResponse {
  id: string
  studentNumber: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  fullName: string
  gender?: Gender
  birthdate?: string // LocalDate (YYYY-MM-DD)
  birthplace?: string
  civilStatus?: string
  nationality?: string
  religion?: string
  profilePhotoPath?: string
  status: StudentStatus
}

export interface StudentContactRequest {
  mobileNumber?: string
  telephoneNumber?: string
  emailAddress?: string
  currentAddress?: string
  permanentAddress?: string
  currentRegionCode?: string
  currentRegionName?: string
  currentProvinceCode?: string
  currentProvinceName?: string
  currentCityMunicipalityCode?: string
  currentCityMunicipalityName?: string
  currentBarangayCode?: string
  currentBarangayName?: string
  currentZipCode?: string
  permanentRegionCode?: string
  permanentRegionName?: string
  permanentProvinceCode?: string
  permanentProvinceName?: string
  permanentCityMunicipalityCode?: string
  permanentCityMunicipalityName?: string
  permanentBarangayCode?: string
  permanentBarangayName?: string
  permanentZipCode?: string
  emergencyContactName?: string
  emergencyContactNumber?: string
  emergencyContactRelationship?: string
  emergencyContactAddress?: string
}

export interface StudentContactResponse {
  mobileNumber?: string
  telephoneNumber?: string
  emailAddress?: string
  currentAddress?: string
  permanentAddress?: string
  currentRegionCode?: string
  currentRegionName?: string
  currentProvinceCode?: string
  currentProvinceName?: string
  currentCityMunicipalityCode?: string
  currentCityMunicipalityName?: string
  currentBarangayCode?: string
  currentBarangayName?: string
  currentZipCode?: string
  permanentRegionCode?: string
  permanentRegionName?: string
  permanentProvinceCode?: string
  permanentProvinceName?: string
  permanentCityMunicipalityCode?: string
  permanentCityMunicipalityName?: string
  permanentBarangayCode?: string
  permanentBarangayName?: string
  permanentZipCode?: string
  emergencyContactName?: string
  emergencyContactNumber?: string
  emergencyContactRelationship?: string
  emergencyContactAddress?: string
}

export interface StudentFamilyRequest {
  fatherName?: string
  fatherOccupation?: string
  fatherContactNumber?: string
  motherName?: string
  motherOccupation?: string
  motherContactNumber?: string
  guardianName?: string
  guardianRelationship?: string
  guardianContactNumber?: string
  guardianAddress?: string
  householdIncomeRange?: string
}

export interface StudentFamilyResponse {
  fatherName?: string
  fatherOccupation?: string
  fatherContactNumber?: string
  motherName?: string
  motherOccupation?: string
  motherContactNumber?: string
  guardianName?: string
  guardianRelationship?: string
  guardianContactNumber?: string
  guardianAddress?: string
  householdIncomeRange?: string
}

export interface StudentEducationalRequest {
  elementarySchoolName?: string
  elementarySchoolAddress?: string
  elementaryYearGraduated?: number
  juniorHighSchoolName?: string
  juniorHighSchoolAddress?: string
  juniorHighSchoolYearGraduated?: number
  seniorHighSchoolName?: string
  seniorHighSchoolAddress?: string
  seniorHighSchoolStrand?: string
  seniorHighSchoolYearGraduated?: number
  previousCollege?: string
  previousProgram?: string
  previousSchoolYearAttended?: string
  admissionType?: AdmissionType
}

export interface StudentEducationalResponse {
  elementarySchoolName?: string
  elementarySchoolAddress?: string
  elementaryYearGraduated?: number
  juniorHighSchoolName?: string
  juniorHighSchoolAddress?: string
  juniorHighSchoolYearGraduated?: number
  seniorHighSchoolName?: string
  seniorHighSchoolAddress?: string
  seniorHighSchoolStrand?: string
  seniorHighSchoolYearGraduated?: number
  previousCollege?: string
  previousProgram?: string
  previousSchoolYearAttended?: string
  admissionType?: AdmissionType
}

export interface StudentAcademicRequest {
  programId: string
  curriculumId: string
  yearLevel: number
  dateAdmitted: string // LocalDate (YYYY-MM-DD)
  schoolYearAdmitted: string
  classification?: StudentClassification
  academicStatus?: AcademicStatus
}

export interface StudentAcademicResponse {
  programId: string
  programCode: string
  curriculumId: string
  curriculumCode: string
  yearLevel: number
  dateAdmitted: string // LocalDate (YYYY-MM-DD)
  schoolYearAdmitted: string
  classification?: StudentClassification
  academicStatus?: AcademicStatus
}

export interface StudentRequest {
  personal: StudentPersonalRequest
  contact?: StudentContactRequest
  family?: StudentFamilyRequest
  educational?: StudentEducationalRequest
  academic: StudentAcademicRequest
}

export interface StudentResponse {
  personal: StudentPersonalResponse
  contact?: StudentContactResponse
  family?: StudentFamilyResponse
  educational?: StudentEducationalResponse
  academic: StudentAcademicResponse
}

export type Student = StudentResponse

export interface StudentSummary {
  id: string
  studentNumber: string
  fullName: string
  emailAddress?: string
  programId: string
  programCode: string
  yearLevel: number
  status: StudentStatus
  schoolYearAdmitted: string
}

export type StudentSummaryResponse = StudentSummary

export interface StudentDocumentResponse {
  id: string
  studentId: string
  documentType: string
  fileName: string
  filePath: string
  mimeType: string
  fileSize: number
  uploadedBy: string
  verificationStatus: DocumentVerificationStatus
  verifiedBy?: string
  verifiedAt?: string // Instant
  remarks?: string
}

export interface DocumentVerificationRequest {
  status: DocumentVerificationStatus
  remarks?: string
}

export type GradeRemark =
  | "PASSED"
  | "FAILED"
  | "INCOMPLETE"
  | "DROPPED"
  | "NO_GRADE"
  | "WITHDRAWN"
  | "CONDITIONAL"

export type GradeStatus =
  | "DRAFT"
  | "ENCODED"
  | "SUBMITTED"
  | "APPROVED"
  | "LOCKED"
  | "RETURNED_FOR_CORRECTION"

export interface AcademicRecordResponse {
  id: string
  gradeId?: string
  courseId: string
  courseCode: string
  courseTitle: string
  creditUnits: number
  earnedUnits: number
  finalGrade?: number
  remarks?: GradeRemark
  gradeStatus?: GradeStatus
  sectionId?: string
  sectionCode?: string
  facultyId?: string
  facultyName?: string
  schoolYearId: string
  schoolYear: string
  semesterId: string
  semesterName: string
  approvedAt?: string
  lockedAt?: string
}

export interface StudentAcademicRecordsResponse {
  studentId: string
  studentNumber: string
  fullName: string
  programId: string
  programCode: string
  curriculumId: string
  curriculumCode: string
  records: AcademicRecordResponse[]
}
export type GradingPeriod = "MIDTERM" | "FINAL"
export type ScoreStatus = "PENDING" | "SCORED" | "ABSENT" | "EXCUSED"
export type GradingScaleBand = {
  id?: string
  minimumPercentage: number
  maximumPercentage: number
  gradePoint: number
  remark: "PASSED" | "FAILED"
}
export type GradingScale = {
  id: string
  scaleCode: string
  scaleName: string
  version: number
  status: ActiveStatus
  bands: GradingScaleBand[]
}
export type GradingCategory = {
  id?: string
  period: GradingPeriod
  categoryName: string
  weight: number
  sortOrder: number
}
export type GradingTemplate = {
  id: string
  templateCode: string
  templateName: string
  programId: string
  programCode: string
  courseId: string
  courseCode: string
  scaleId: string
  scaleName: string
  version: number
  midtermWeight: number
  finalWeight: number
  status: ActiveStatus
  categories: GradingCategory[]
}
export type GradeClassSummary = {
  scheduleId: string
  courseId: string
  courseCode: string
  courseTitle: string
  sectionCode: string
  facultyId: string
  facultyName: string
  programId: string
  programCode: string
  departmentId: string
  departmentCode: string
  schoolYearId: string
  schoolYear: string
  semesterId: string
  semesterName: string
  enrolledCount: number
  completedCount: number
  status: GradeStatus
  latestCorrectionReason?: string
  initialized: boolean
}
export type GradebookCategory = {
  id: string
  period: GradingPeriod
  name: string
  weight: number
  sortOrder: number
}
export type GradebookItem = {
  id: string
  categoryId: string
  period: GradingPeriod
  categoryName: string
  title: string
  maximumScore: number
  dueDate?: string
  sortOrder: number
}
export type GradebookScore = {
  itemId: string
  score?: number
  status: ScoreStatus
}
export type GradebookStudent = {
  enrollmentSubjectId: string
  studentId: string
  studentNumber: string
  studentName: string
  scores: GradebookScore[]
  midtermPercentage: number
  finalPeriodPercentage: number
  finalPercentage: number
  gradePoint?: number
  remark: GradeRemark
  overrideReason?: string
  complete: boolean
}
export type Gradebook = {
  id: string
  scheduleId: string
  courseCode: string
  courseTitle: string
  sectionCode: string
  facultyName: string
  schoolYear: string
  semesterName: string
  status: GradeStatus
  latestCorrectionReason?: string
  midtermWeight: number
  finalWeight: number
  categories: GradebookCategory[]
  items: GradebookItem[]
  students: GradebookStudent[]
  history: {
    fromStatus?: GradeStatus
    toStatus: GradeStatus
    reason?: string
    changedBy?: string
    changedAt: string
  }[]
  validationIssues: string[]
}
export type Meeting = {
  id?: string
  dayOfWeek: string
  startTime: string
  endTime: string
  componentType?: "LECTURE" | "LABORATORY" | "COMBINED"
  deliveryMode?: "ONSITE" | "ONLINE" | "HYBRID"
  roomId?: string
  roomCode?: string
  roomName?: string
  locationDetails?: string
  revisionNumber?: number
  active?: boolean
}
export type Schedule = {
  id: string
  sectionId: string
  sectionCode: string
  programId: string
  programCode: string
  curriculumId: string
  curriculumCode: string
  yearLevel: number
  courseId: string
  courseCode: string
  courseTitle: string
  creditUnits: number
  facultyId: string
  facultyName: string
  roomId?: string
  roomCode?: string
  schoolYearId: string
  schoolYear: string
  semesterId: string
  semesterName: string
  capacity: number
  enrolledCount: number
  availableSeats: number
  status: string
  version: number
  hasEnrollmentActivity: boolean
  gradebookSubmitted: boolean
  gradebookLocked: boolean
  identityLocked: boolean
  roomSummary: string
  warnings: { code: string; message: string; requiresOverride: boolean }[]
  latestChange?: {
    id: string
    action: string
    reason?: string
    actorName?: string
    changedAt: string
  }
  meetings: Meeting[]
}
export type ScheduleRequest = {
  sectionId: string
  courseId: string
  facultyId: string
  roomId?: string
  capacity: number
  status: "DRAFT" | "ACTIVE" | "CANCELLED" | "ARCHIVED"
  meetings: Meeting[]
  expectedVersion?: number
}
export type ScheduleHistory = {
  id: string
  scheduleId: string
  action: string
  reason?: string
  actorName?: string
  changedAt: string
  acknowledgedWarnings: string[]
}
export type FacultyLoad = {
  facultyId: string
  facultyName: string
  facultyType: string
  activeClasses: number
  confirmedStudents: number
  weeklyContactHours: number
  maximumWeeklyContactHours?: number
  maximumActiveClasses?: number
  remainingHours?: number
  overloaded: boolean
  policyConfigured: boolean
}
export type RoomAvailability = {
  roomId: string
  roomCode: string
  roomName: string
  capacity?: number
  building?: string
  roomType?: string
  dayOfWeek?: string
  occupiedPeriods: {
    scheduleId: string
    startTime: string
    endTime: string
    courseCode: string
    sectionCode: string
  }[]
}
export type ScheduleLoadPolicy = {
  id: string
  schoolYearId: string
  schoolYear: string
  semesterId: string
  semesterName: string
  facultyType?: FacultyType
  maximumWeeklyContactHours: number
  maximumActiveClasses?: number
  active: boolean
}
export type ScheduleCopyPreview = {
  executable: boolean
  globalIssues: string[]
  items: {
    sourceScheduleId: string
    targetSectionId?: string
    courseCode?: string
    sourceSectionCode?: string
    targetSectionCode?: string
    copyable: boolean
    issues: string[]
  }[]
}
export type ScheduleConflict = {
  conflictType: string
  scheduleId: string
  courseCode: string
  courseTitle: string
  sectionCode: string
  facultyName: string
  roomCode: string
  dayOfWeek: string
  existingStartTime: string
  existingEndTime: string
  requestedStartTime: string
  requestedEndTime: string
}
export type ScheduleConflictResponse = {
  hasConflicts: boolean
  conflicts: ScheduleConflict[]
}
export type EnrollmentSubject = {
  id: string
  scheduleId: string
  courseId: string
  courseCode: string
  courseTitle: string
  creditUnits: number
  sectionId: string
  sectionCode: string
  facultyName: string
  roomCode: string
  status: string
  meetings: Meeting[]
}
export type ValidationIssue = {
  code: string
  message: string
  subjectId?: string
  scheduleId?: string
}
export type EnrollmentValidation = {
  valid: boolean
  blockingIssues: ValidationIssue[]
  warnings: ValidationIssue[]
  totalCreditUnits: number
  subjectCount: number
}
export type Enrollment = {
  id: string
  studentId: string
  studentNumber: string
  studentName: string
  programId: string
  programCode: string
  yearLevel: number
  sectionId?: string
  sectionCode?: string
  schoolYearId: string
  schoolYear: string
  semesterId: string
  semesterName: string
  status: string
  remarks?: string
  totalCreditUnits: number
  subjectCount: number
  subjects: EnrollmentSubject[]
  validation?: EnrollmentValidation
}
export type SchoolYear = { id: string; schoolYear: string; active: boolean }
export type Semester = {
  id: string
  name: string
  sortOrder: number
  active: boolean
}

export type ActiveStatus = "ACTIVE" | "INACTIVE"

export type DegreeType =
  "BACHELOR" | "ASSOCIATE" | "DIPLOMA" | "CERTIFICATE" | "GRADUATE_PROGRAM"

export type CourseType =
  | "MAJOR"
  | "PROFESSIONAL_COURSE"
  | "GENERAL_EDUCATION"
  | "PHYSICAL_EDUCATION"
  | "NSTP"
  | "ELECTIVE"
  | "LABORATORY"
  | "SEMINAR"
  | "THESIS_CAPSTONE"

export type EmploymentStatus =
  "FULL_TIME" | "PART_TIME" | "CONTRACTUAL" | "VISITING_LECTURER" | "INACTIVE"

export type FacultyType =
  "INSTRUCTOR" | "PROFESSOR" | "LECTURER" | "DEAN" | "PROGRAM_HEAD"

export interface Department {
  id: string
  departmentCode: string
  departmentName: string
  dean?: string
  description?: string
  status: ActiveStatus
}

export interface Program {
  id: string
  programCode: string
  programName: string
  departmentId: string
  departmentCode: string
  degreeType: DegreeType
  programDuration?: number
  description?: string
  status: ActiveStatus
}

export interface Course {
  id: string
  courseCode: string
  courseTitle: string
  courseDescription?: string
  lectureHoursPerWeek: number
  laboratoryHoursPerWeek: number
  creditUnits: number
  courseType: CourseType
  departmentId: string
  departmentCode: string
  status: ActiveStatus
}

export interface Faculty {
  id: string
  employeeNumber: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  email: string
  contactNumber?: string
  departmentId: string
  departmentCode: string
  employmentStatus: EmploymentStatus
  facultyType: FacultyType
  specialization?: string
  status: ActiveStatus
}

export interface Room {
  id: string
  roomCode: string
  roomName: string
  capacity?: number
  building?: string
  roomType?: string
  status: ActiveStatus
}

export interface Section {
  id: string
  sectionCode: string
  programId: string
  programCode: string
  curriculumId?: string
  curriculumCode?: string
  schoolYearId: string
  schoolYear: string
  semesterId: string
  semesterName: string
  yearLevel: number
  maximumCapacity?: number
  confirmedCount?: number
  status: ActiveStatus
}

export type AssessmentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "CREDIT_BALANCE"
  | "CANCEL_PENDING"
  | "CANCELLED"
  | "REFUNDED"
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "E_WALLET" | "CHECK"
export type PaymentStatus = "POSTED" | "VOIDED"
export type FeeCategory = "TUITION" | "LABORATORY" | "MISCELLANEOUS" | "OTHER"
export type FeeComputationType =
  | "FIXED_AMOUNT"
  | "PER_UNIT"
  | "PER_SUBJECT"
  | "PER_LABORATORY_SUBJECT"
  | "PER_SEMESTER"
  | "PER_PROGRAM"
  | "PER_YEAR_LEVEL"
export type AssessmentItem = {
  id: string
  feeItemId?: string
  feeCode?: string
  enrollmentSubjectId?: string
  description: string
  category: FeeCategory
  computationType: FeeComputationType
  quantity: number
  unitAmount: number
  totalAmount: number
}
export type Payment = {
  id: string
  assessmentId: string
  studentId: string
  officialReceiptNumber: string
  amount: number
  paymentMethod: PaymentMethod
  externalReference?: string
  remarks?: string
  paidAt: string
  cashierUserId: string
  cashierName: string
  status: PaymentStatus
  voidReason?: string
  voidedAt?: string
  voidedByUserId?: string
  voidedByName?: string
  requestId?: string
  cashierSessionId?: string
  balanceAfter?: number
  legacyReceipt: boolean
}
export type AssessmentSummary = {
  id: string
  studentId: string
  studentNumber: string
  studentName: string
  enrollmentId: string
  schoolYear: string
  semesterName: string
  totalAssessment: number
  amountPaid: number
  refundedAmount: number
  netPaidAmount: number
  creditBalance: number
  balance: number
  status: AssessmentStatus
}
export type Assessment = AssessmentSummary & {
  schoolYearId: string
  semesterId: string
  totalUnits: number
  baseAssessmentAmount: number
  adjustmentAmount: number
  tuitionAmount: number
  laboratoryFeeAmount: number
  miscellaneousFeeAmount: number
  otherFeeAmount: number
  discountAmount: number
  penaltyAmount: number
  requiresFinanceReview: boolean
  items: AssessmentItem[]
  payments: Payment[]
}
export type PendingAssessmentEnrollment = {
  enrollmentId: string
  studentId: string
  studentNumber: string
  studentName: string
  programId: string
  programCode: string
  yearLevel: number
  schoolYearId: string
  schoolYear: string
  semesterId: string
  semesterName: string
  totalCreditUnits: number
  subjectCount: number
}
export type FeeRule = {
  id?: string
  schoolYearId: string
  schoolYear?: string
  semesterId?: string
  semesterName?: string
  programId?: string
  programCode?: string
  yearLevel?: number
  computationType: FeeComputationType
  amount: number
  status: ActiveStatus
}
export type FeeItemSummary = {
  id: string
  feeCode: string
  feeName: string
  category: FeeCategory
  status: ActiveStatus
}
export type FeeItem = FeeItemSummary & {
  description?: string
  rules: FeeRule[]
}

export type CurriculumStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED"
export type RequiredStatus = "REQUIRED" | "OPTIONAL" | "ELECTIVE"

export interface CurriculumRequest {
  programId: string
  curriculumCode: string
  curriculumName: string
  effectiveSchoolYear: string
  version: string
  status: CurriculumStatus
  description?: string
}

export interface CurriculumResponse {
  id: string
  programId: string
  programCode: string
  curriculumCode: string
  curriculumName: string
  effectiveSchoolYear: string
  version: string
  status: CurriculumStatus
  description?: string
}

export interface CourseLinkResponse {
  id: string
  courseCode: string
  courseTitle: string
}

export interface CurriculumCourseRequest {
  yearLevel: number
  semester: string
  courseId: string
  sortOrder: number
  requiredStatus: RequiredStatus
  prerequisiteCourseIds?: string[]
  corequisiteCourseIds?: string[]
}

export interface CurriculumCourseResponse {
  id: string
  yearLevel: number
  semester: string
  courseId: string
  courseCode: string
  courseTitle: string
  lectureHoursPerWeek: number
  laboratoryHoursPerWeek: number
  creditUnits: number
  sortOrder: number
  requiredStatus: RequiredStatus
  prerequisites: CourseLinkResponse[]
  corequisites: CourseLinkResponse[]
}

export interface CurriculumDetailResponse {
  curriculum: CurriculumResponse
  courses: CurriculumCourseResponse[]
}

export interface CurriculumTermResponse {
  yearLevel: number
  semester: string
  totalLectureHours: number
  totalLaboratoryHours: number
  totalCreditUnits: number
  courses: CurriculumCourseResponse[]
}

export interface CurriculumChecklistResponse {
  curriculum: CurriculumResponse
  terms: CurriculumTermResponse[]
}
