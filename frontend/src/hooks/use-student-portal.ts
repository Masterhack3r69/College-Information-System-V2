import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type StudentProfile = {
  studentId: string
  studentNumber: string
  fullName: string
  programCode: string
  programName: string
  curriculumCode: string
  yearLevel: number
  classification: string
  academicStatus: string
  status: string
  email: string
  mobileNumber?: string
  telephoneNumber?: string
  currentAddress?: string
  emergencyContactName?: string
  emergencyContactNumber?: string
  emergencyContactRelationship?: string
  emergencyContactAddress?: string
}
export type StudentTerm = {
  schoolYearId: string
  schoolYear: string
  semesterId: string
  semesterName: string
  enrollmentEnabled: boolean
  attendanceVisible: boolean
  portalNotice?: string
}
export type StudentEnrollment = {
  id: string
  status: string
  yearLevel: number
  sectionCode?: string
  schoolYear: string
  semesterName: string
  submittedAt?: string
  programCode?: string
  totalCreditUnits?: number
  subjectCount?: number
  subjects?: StudentEnrollmentSubject[]
  validation?: EnrollmentValidation
}
export type StudentEnrollmentSubject = {
  id: string
  scheduleId: string
  courseId: string
  courseCode: string
  courseTitle: string
  creditUnits: number
  sectionCode: string
  facultyName?: string
  roomCode?: string
  status: string
  meetings: ClassMeeting[]
}
export type EnrollmentValidation = {
  valid: boolean
  blockingIssues: { code: string; message: string }[]
  warnings: { code: string; message: string }[]
  totalCreditUnits: number
  subjectCount: number
}
export type ClassMeeting = { dayOfWeek: string; startTime: string; endTime: string }
export type StudentSchedule = {
  scheduleId: string
  courseCode: string
  courseTitle: string
  sectionCode: string
  roomCode?: string
  componentType?: string
  deliveryMode?: string
  locationDetails?: string
  dayOfWeek: string
  startTime: string
  endTime: string
  faculty: string
}
export type StudentScheduleTerm = { schoolYearId:string; schoolYear:string; semesterId:string; semesterName:string; active:boolean }
export type StudentScheduleChange = { id:string; action:string; reason?:string; changedAt:string; actorName?:string; courseCode:string; sectionCode:string }
export type StudentGrade = {
  id: string
  courseCode: string
  courseTitle: string
  units: number
  grade: number
  remarks: string
  earnedUnits: number
  schoolYear: string
  semesterName: string
  postedAt: string
}
export type StudentProgress = {
  requiredUnits: number
  completedUnits: number
  requiredCourses: number
  completedCourses: number
}
export type StudentAssessment = {
  id: string
  baseAssessmentAmount: number
  adjustmentAmount: number
  totalAssessment: number
  amountPaid: number
  refundedAmount: number
  netPaidAmount: number
  balance: number
  creditBalance: number
  status: string
  schoolYear: string
  semesterName: string
  items: unknown
  installments: unknown
  adjustments: unknown
}
export type StudentPayment = {
  id: string
  receiptNumber: string
  amount: number
  balanceAfter?: number
  legacyReceipt: boolean
  paymentMethod: string
  paidAt: string
  status: string
  voidReason?: string
}
export type StudentAnnouncement = {
  id: string
  title: string
  body: string
  publishedAt: string
  source: string
}
export type StudentMaterial = {
  id: string
  title: string
  description?: string
  filename: string
  mimeType: string
  fileSize: number
  courseCode: string
}
export type StudentForm = {
  id: string
  title: string
  description?: string
  filename: string
  mimeType: string
  fileSize: number
}
export type StudentRequest = {
  id: string
  requestType: string
  documentName?: string
  purpose: string
  status: string
  studentComment?: string
  staffComment?: string
  fulfilledFilename?: string
  downloadReady: boolean
  createdAt: string
  updatedAt: string
}
export type AvailableClass = {
  scheduleId: string
  courseId: string
  courseCode: string
  courseTitle: string
  units: number
  sectionId: string
  sectionCode: string
  roomCode: string
  faculty: string
  curriculumCourseId: string
  curriculumYearLevel: number
  requiredStatus: "REQUIRED" | "OPTIONAL" | "ELECTIVE"
  backSubject: boolean
  recommendationType: "BACK_SUBJECT" | "NORMAL_TERM" | "ELECTIVE" | "OPTIONAL"
  availableSeats: number
  selected: boolean
  meetings: ClassMeeting[]
}
export type AcademicPlanItem = {
  curriculumCourseId: string
  courseId: string
  courseCode: string
  courseTitle: string
  creditUnits: number
  yearLevel: number
  semester: string
  requirement: "REQUIRED" | "OPTIONAL" | "ELECTIVE"
  status: "COMPLETED" | "CREDITED" | "ENROLLED" | "FAILED" | "MISSING" | "PENDING_EVALUATION" | "OPTIONAL"
  detail?: string
}
export type AcademicPlan = {
  studentId: string
  curriculumId: string
  curriculumCode: string
  completedCourses: number
  creditedCourses: number
  missingCourses: number
  pendingEvaluations: number
  earnedUnits: number
  items: AcademicPlanItem[]
  credits: CourseCredit[]
}
export type CourseCredit = { id: string; courseId: string; courseCode: string; courseTitle: string; creditedUnits: number; sourceLabel: string; postedAt: string; active?: boolean }
export type AcademicEvaluationSummary = { id: string; evaluationType: string; status: string; sourceInstitution?: string; targetCurriculumCode: string; sourceCourseCount: number; recommendedMatchCount: number; submittedAt?: string; decidedAt?: string }
export type GraduationAuditSummary = { id: string; result: string; totalRequiredUnits: number; earnedUnits: number; missingRequiredCount: number; unmetElectiveGroupCount: number; pendingEvaluationCount: number; auditedAt: string }
export type StudentDashboard = {
  profile: StudentProfile
  term: StudentTerm
  enrollment: StudentEnrollment
  schedule: StudentSchedule[]
  finance: StudentAssessment | Record<string, never>
  progress: StudentProgress
  grades: StudentGrade[]
  announcements: StudentAnnouncement[]
}

export const useStudentDashboard = () =>
  useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => api<StudentDashboard>("/student/me/dashboard"),
  })
export const useStudentProfile = () =>
  useQuery({
    queryKey: ["student-profile"],
    queryFn: () => api<StudentProfile>("/student/me/profile"),
  })
export const useStudentEnrollment = () =>
  useQuery({
    queryKey: ["student-enrollment"],
    queryFn: () => api<StudentEnrollment>("/student/me/enrollment"),
  })
export const useAvailableClasses = () =>
  useQuery({
    queryKey: ["student-available-classes"],
    queryFn: () => api<AvailableClass[]>("/student/me/available-classes"),
  })
export const useStudentSchedule = (schoolYearId?:string, semesterId?:string) =>
  useQuery({
    queryKey: ["student-schedule", schoolYearId, semesterId],
    queryFn: () => api<StudentSchedule[]>(`/student/me/schedule${schoolYearId&&semesterId?`?schoolYearId=${schoolYearId}&semesterId=${semesterId}`:""}`),
  })
export const useStudentScheduleTerms = () => useQuery({ queryKey:["student-schedule-terms"], queryFn:()=>api<StudentScheduleTerm[]>("/student/me/schedule/terms") })
export const useStudentScheduleChanges = (schoolYearId?:string,semesterId?:string) => useQuery({ queryKey:["student-schedule-changes",schoolYearId,semesterId], queryFn:()=>api<StudentScheduleChange[]>(`/student/me/schedule/changes?schoolYearId=${schoolYearId}&semesterId=${semesterId}`), enabled:!!schoolYearId&&!!semesterId })
export const useStudentGrades = () =>
  useQuery({
    queryKey: ["student-grades"],
    queryFn: () => api<StudentGrade[]>("/student/me/grades"),
  })
export const useStudentProgress = () =>
  useQuery({
    queryKey: ["student-progress"],
    queryFn: () => api<StudentProgress>("/student/me/curriculum-progress"),
  })
export const useStudentAcademicPlan = () =>
  useQuery({ queryKey: ["student-academic-plan"], queryFn: () => api<AcademicPlan>("/student/me/academic-plan") })
export const useStudentCourseCredits = () =>
  useQuery({ queryKey: ["student-course-credits"], queryFn: () => api<CourseCredit[]>("/student/me/course-credits") })
export const useStudentAcademicEvaluations = () =>
  useQuery({ queryKey: ["student-academic-evaluations"], queryFn: () => api<AcademicEvaluationSummary[]>("/student/me/academic-evaluations") })
export const useStudentGraduationAudits = () =>
  useQuery({ queryKey: ["student-graduation-audits"], queryFn: () => api<GraduationAuditSummary[]>("/student/me/graduation-audits") })
export const useStudentAttendance = () =>
  useQuery({
    queryKey: ["student-attendance"],
    queryFn: () =>
      api<Record<string, number | string>[]>("/student/me/attendance"),
  })
export const useStudentFinance = () =>
  useQuery({
    queryKey: ["student-finance"],
    queryFn: () => api<StudentAssessment[]>("/student/me/assessments"),
  })
export const useStudentPayments = () =>
  useQuery({
    queryKey: ["student-payments"],
    queryFn: () => api<StudentPayment[]>("/student/me/payments"),
  })
export const useStudentAnnouncements = () =>
  useQuery({
    queryKey: ["student-announcements"],
    queryFn: () => api<StudentAnnouncement[]>("/student/me/announcements"),
  })
export const useStudentMaterials = () =>
  useQuery({
    queryKey: ["student-materials"],
    queryFn: () => api<StudentMaterial[]>("/student/me/materials"),
  })
export const useStudentForms = () =>
  useQuery({
    queryKey: ["student-forms"],
    queryFn: () => api<StudentForm[]>("/student/me/forms"),
  })
export const useStudentRequests = () =>
  useQuery({
    queryKey: ["student-requests"],
    queryFn: () => api<StudentRequest[]>("/student/me/requests"),
  })
export const useUpdateStudentProfile = () => {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (
      v: Omit<
        StudentProfile,
        | "studentId"
        | "studentNumber"
        | "fullName"
        | "programCode"
        | "programName"
        | "curriculumCode"
        | "yearLevel"
        | "classification"
        | "academicStatus"
        | "status"
      >
    ) =>
      api<StudentProfile>("/student/me/profile", {
        method: "PUT",
        body: JSON.stringify(v),
      }),
    onSuccess: (d) => c.setQueryData(["student-profile"], d),
  })
}
export const useCreateStudentRequest = () => {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      requestType: string
      documentName?: string
      purpose: string
      comment?: string
    }) =>
      api("/student/me/requests", { method: "POST", body: JSON.stringify(v) }),
    onSuccess: () =>
      void c.invalidateQueries({ queryKey: ["student-requests"] }),
  })
}
export const useCancelStudentRequest = () => {
  const c = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/student/me/requests/${id}/cancel`, { method: "POST" }),
    onSuccess: () =>
      void c.invalidateQueries({ queryKey: ["student-requests"] }),
  })
}
