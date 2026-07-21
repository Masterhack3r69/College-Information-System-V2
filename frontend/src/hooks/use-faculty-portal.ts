import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type FacultyClass = { scheduleId:string; courseCode:string; courseTitle:string; sectionCode:string; roomCode:string; schoolYear:string; semesterName:string; studentCount:number; gradeStatus:string; attendanceCount:number }
export type FacultyMeeting = { id:string; dayOfWeek:string; startTime:string; endTime:string; roomCode?:string; componentType?:string; deliveryMode?:string; locationDetails?:string }
export type RosterStudent = { enrollmentSubjectId:string; studentId:string; studentNumber:string; studentName:string; programCode:string; sectionCode:string; status:string }
export type FacultyClassDetail = FacultyClass & { meetings:FacultyMeeting[]; roster:RosterStudent[] }
export type FacultyDashboard = { today:(FacultyClass & {startTime:string;endTime:string})[]; classes:FacultyClass[]; returnedGradebooks:number; activeTerm:{schoolYearId?:string;schoolYear?:string;semesterId?:string;semesterName?:string}; hasAdvising:boolean }
export type ScheduleTerm = { schoolYearId:string; schoolYear:string; semesterId:string; semesterName:string; active:boolean }
export type PortalScheduleChange = { id:string; action:string; reason?:string; changedAt:string; actorName?:string; courseCode:string; sectionCode:string }
export type AttendanceSession = { id:string; meetingDate:string; startTime:string; endTime:string; roomCode:string; status:"DRAFT"|"FINALIZED"; version:number; entries?:AttendanceEntry[] }
export type AttendanceEntry = { enrollmentSubjectId:string; studentNumber:string; studentName:string; status:"PRESENT"|"LATE"|"ABSENT"|"EXCUSED"; notes?:string }
export type ContentItem = { id:string; title:string; body?:string; description?:string; filename?:string; status:string; publishedAt?:string }
export type Advisee = { assignmentId:string; studentId:string; studentNumber:string; studentName:string; programCode:string; yearLevel:number; academicStatus:string; sectionCode:string; email:string; mobileNumber:string }
export type FacultyProfile = { employeeNumber:string; fullName:string; email:string; contactNumber?:string; department:string; employmentStatus:string; facultyType:string }

export const useFacultyDashboard=()=>useQuery({queryKey:["faculty-dashboard"],queryFn:()=>api<FacultyDashboard>("/faculty/me/dashboard")})
export const useFacultyClasses=()=>useQuery({queryKey:["faculty-classes"],queryFn:()=>api<FacultyClass[]>("/faculty/me/classes")})
export const useFacultyClass=(id?:string)=>useQuery({queryKey:["faculty-class",id],queryFn:()=>api<FacultyClassDetail>(`/faculty/me/classes/${id}`),enabled:!!id})
export const useFacultySchedule=(schoolYearId?:string,semesterId?:string)=>useQuery({queryKey:["faculty-schedule",schoolYearId,semesterId],queryFn:()=>api<(FacultyMeeting&FacultyClass)[]>(`/faculty/me/schedule${schoolYearId&&semesterId?`?schoolYearId=${schoolYearId}&semesterId=${semesterId}`:""}`)})
export const useFacultyScheduleTerms=()=>useQuery({queryKey:["faculty-schedule-terms"],queryFn:()=>api<ScheduleTerm[]>("/faculty/me/schedule/terms")})
export const useFacultyScheduleChanges=(schoolYearId?:string,semesterId?:string)=>useQuery({queryKey:["faculty-schedule-changes",schoolYearId,semesterId],queryFn:()=>api<PortalScheduleChange[]>(`/faculty/me/schedule/changes?schoolYearId=${schoolYearId}&semesterId=${semesterId}`),enabled:!!schoolYearId&&!!semesterId})
export const useAttendance=(scheduleId?:string)=>useQuery({queryKey:["faculty-attendance",scheduleId],queryFn:()=>api<AttendanceSession[]>(`/faculty/me/classes/${scheduleId}/attendance`),enabled:!!scheduleId})
export const useAttendanceSession=(id?:string)=>useQuery({queryKey:["attendance-session",id],queryFn:()=>api<AttendanceSession>(`/faculty/me/attendance/${id}`),enabled:!!id})
export const useCreateAttendance=()=>{const c=useQueryClient();return useMutation({mutationFn:(v:{scheduleId:string;meetingId:string;meetingDate:string})=>api<AttendanceSession>(`/faculty/me/classes/${v.scheduleId}/attendance`,{method:"POST",body:JSON.stringify(v)}),onSuccess:(d)=>{c.setQueryData(["attendance-session",d.id],d);void c.invalidateQueries({queryKey:["faculty-attendance"]})}})}
export const useSaveAttendance=()=>{const c=useQueryClient();return useMutation({mutationFn:(v:{id:string;entries:AttendanceEntry[]})=>api<AttendanceSession>(`/faculty/me/attendance/${v.id}/entries`,{method:"PUT",body:JSON.stringify({entries:v.entries})}),onSuccess:(d)=>c.setQueryData(["attendance-session",d.id],d)})}
export const useFinalizeAttendance=()=>{const c=useQueryClient();return useMutation({mutationFn:(id:string)=>api<AttendanceSession>(`/faculty/me/attendance/${id}/finalize`,{method:"POST"}),onSuccess:(d)=>{c.setQueryData(["attendance-session",d.id],d);void c.invalidateQueries({queryKey:["faculty-attendance"]})}})}
export const useAnnouncements=(id?:string)=>useQuery({queryKey:["faculty-announcements",id],queryFn:()=>api<ContentItem[]>(`/faculty/me/classes/${id}/announcements`),enabled:!!id})
export const useSaveAnnouncement=()=>{const c=useQueryClient();return useMutation({mutationFn:(v:{scheduleId:string;title:string;body:string;status:string})=>api<ContentItem>(`/faculty/me/classes/${v.scheduleId}/announcements`,{method:"POST",body:JSON.stringify(v)}),onSuccess:(_,v)=>void c.invalidateQueries({queryKey:["faculty-announcements",v.scheduleId]})})}
export const useMaterials=(id?:string)=>useQuery({queryKey:["faculty-materials",id],queryFn:()=>api<ContentItem[]>(`/faculty/me/classes/${id}/materials`),enabled:!!id})
export const useAdvisees=()=>useQuery({queryKey:["faculty-advisees"],queryFn:()=>api<Advisee[]>("/faculty/me/advising")})
export const useFacultyProfile=()=>useQuery({queryKey:["faculty-profile"],queryFn:()=>api<FacultyProfile>("/faculty/me/profile")})
export const useUpdateFacultyProfile=()=>{const c=useQueryClient();return useMutation({mutationFn:(v:{email:string;contactNumber:string})=>api<FacultyProfile>("/faculty/me/profile",{method:"PUT",body:JSON.stringify(v)}),onSuccess:(d)=>c.setQueryData(["faculty-profile"],d)})}
