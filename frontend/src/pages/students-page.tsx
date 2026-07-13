import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Download,
  FileText,
  Search,
  UserPlus,
  Loader2,
  Edit,
  FileUp,
} from "lucide-react"
import { openPdf, ApiError } from "@/lib/api"
import type {
  DocumentVerificationStatus,
  StudentRequest,
  StudentResponse,
  StudentDocumentResponse,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useForm, Controller, type Path } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  useStudents,
  useStudent,
  useCreateStudent,
  useUpdateStudent,
  useStudentDocuments,
  useUploadStudentDocument,
  useVerifyStudentDocument,
  useStudentAcademicRecords,
  useStudentLatestEnrollment,
} from "@/hooks/use-students"
import { usePrograms, useSchoolYears } from "@/hooks/use-setup"
import { useCurricula } from "@/hooks/use-curriculum"
import { CascadingAddressSelector, type AddressValues } from "@/components/cascading-address-selector"

function DualAddressFields({
  current,
  permanent,
  sameAsCurrent,
  onCurrentChange,
  onPermanentChange,
  onSameAsCurrentChange,
}: {
  current: AddressValues
  permanent: AddressValues
  sameAsCurrent: boolean
  onCurrentChange: (address: AddressValues) => void
  onPermanentChange: (address: AddressValues) => void
  onSameAsCurrentChange: (checked: boolean) => void
}) {
  return (
    <div className="col-span-full space-y-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-[#0b1f3a]">Addresses</h4>
        <div className="flex items-center gap-2">
          <Checkbox
            id="permanent-same-as-current"
            checked={sameAsCurrent}
            onCheckedChange={(checked) => onSameAsCurrentChange(checked === true)}
          />
          <Label htmlFor="permanent-same-as-current" className="cursor-pointer text-sm font-normal">
            Permanent address is the same as current address
          </Label>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-lg border bg-slate-50/60 p-4">
          <h5 className="mb-4 text-sm font-semibold text-[#0b1f3a]">Current Address</h5>
          <CascadingAddressSelector values={current} onChange={onCurrentChange} compact />
        </section>
        <section className="rounded-lg border bg-slate-50/60 p-4">
          <h5 className="mb-4 text-sm font-semibold text-[#0b1f3a]">Permanent Address</h5>
          <CascadingAddressSelector
            values={permanent}
            onChange={onPermanentChange}
            disabled={sameAsCurrent}
            compact
          />
        </section>
      </div>
    </div>
  )
}

// --- ZOD SCHEMAS ---

const personalSchema = z.object({
  studentNumber: z.string().min(1, "Student number is required").trim(),
  firstName: z.string().min(1, "First name is required").trim(),
  middleName: z.string().optional().or(z.literal("")),
  lastName: z.string().min(1, "Last name is required").trim(),
  suffix: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"] as const),
  birthdate: z.string().min(1, "Birthdate is required"),
  birthplace: z.string().optional().or(z.literal("")),
  civilStatus: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  religion: z.string().optional().or(z.literal("")),
  status: z.enum([
    "APPLICANT",
    "ACTIVE",
    "ENROLLED",
    "INACTIVE",
    "DROPPED",
    "TRANSFERRED",
    "GRADUATED",
    "ARCHIVED",
  ] as const),
})

const academicSchema = z.object({
  programId: z.string().min(1, "Program is required"),
  curriculumId: z.string().min(1, "Curriculum is required"),
  yearLevel: z.coerce.number().min(1, "Year level must be at least 1"),
  dateAdmitted: z.string().min(1, "Date admitted is required"),
  schoolYearAdmitted: z.string().min(1, "School year admitted is required"),
  classification: z.enum([
    "REGULAR",
    "IRREGULAR",
    "TRANSFEREE",
    "RETURNEE",
    "CROSS_ENROLLEE",
    "GRADUATING",
  ] as const),
  academicStatus: z.enum([
    "REGULAR",
    "IRREGULAR",
    "PROBATION",
    "CANDIDATE_FOR_GRADUATION",
    "GRADUATED",
    "DISMISSED",
    "ON_LEAVE",
  ] as const),
})

const contactSchema = z.object({
  mobileNumber: z.string().optional().or(z.literal("")),
  telephoneNumber: z.string().optional().or(z.literal("")),
  emailAddress: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email address"),
  currentAddress: z.string().optional().or(z.literal("")),
  permanentAddress: z.string().optional().or(z.literal("")),
  currentRegionCode: z.string().optional().or(z.literal("")),
  currentRegionName: z.string().optional().or(z.literal("")),
  currentProvinceCode: z.string().optional().or(z.literal("")),
  currentProvinceName: z.string().optional().or(z.literal("")),
  currentCityMunicipalityCode: z.string().optional().or(z.literal("")),
  currentCityMunicipalityName: z.string().optional().or(z.literal("")),
  currentBarangayCode: z.string().optional().or(z.literal("")),
  currentBarangayName: z.string().optional().or(z.literal("")),
  currentZipCode: z.string().optional().or(z.literal("")),
  permanentRegionCode: z.string().optional().or(z.literal("")),
  permanentRegionName: z.string().optional().or(z.literal("")),
  permanentProvinceCode: z.string().optional().or(z.literal("")),
  permanentProvinceName: z.string().optional().or(z.literal("")),
  permanentCityMunicipalityCode: z.string().optional().or(z.literal("")),
  permanentCityMunicipalityName: z.string().optional().or(z.literal("")),
  permanentBarangayCode: z.string().optional().or(z.literal("")),
  permanentBarangayName: z.string().optional().or(z.literal("")),
  permanentZipCode: z.string().optional().or(z.literal("")),
  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactNumber: z.string().optional().or(z.literal("")),
  emergencyContactRelationship: z.string().optional().or(z.literal("")),
  emergencyContactAddress: z.string().optional().or(z.literal("")),
})

const familySchema = z.object({
  fatherName: z.string().optional().or(z.literal("")),
  fatherOccupation: z.string().optional().or(z.literal("")),
  fatherContactNumber: z.string().optional().or(z.literal("")),
  motherName: z.string().optional().or(z.literal("")),
  motherOccupation: z.string().optional().or(z.literal("")),
  motherContactNumber: z.string().optional().or(z.literal("")),
  guardianName: z.string().optional().or(z.literal("")),
  guardianRelationship: z.string().optional().or(z.literal("")),
  guardianContactNumber: z.string().optional().or(z.literal("")),
  guardianAddress: z.string().optional().or(z.literal("")),
  householdIncomeRange: z.string().optional().or(z.literal("")),
})

const educationalSchema = z.object({
  elementarySchoolName: z.string().optional().or(z.literal("")),
  elementarySchoolAddress: z.string().optional().or(z.literal("")),
  elementaryYearGraduated: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  juniorHighSchoolName: z.string().optional().or(z.literal("")),
  juniorHighSchoolAddress: z.string().optional().or(z.literal("")),
  juniorHighSchoolYearGraduated: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  seniorHighSchoolName: z.string().optional().or(z.literal("")),
  seniorHighSchoolAddress: z.string().optional().or(z.literal("")),
  seniorHighSchoolStrand: z.string().optional().or(z.literal("")),
  seniorHighSchoolYearGraduated: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  previousCollege: z.string().optional().or(z.literal("")),
  previousProgram: z.string().optional().or(z.literal("")),
  previousSchoolYearAttended: z.string().optional().or(z.literal("")),
  admissionType: z.enum([
    "NEW_STUDENT",
    "TRANSFEREE",
    "RETURNEE",
    "SHIFTEE",
    "CROSS_ENROLLEE",
    "CONTINUING_STUDENT",
  ] as const),
})

const studentFullSchema = z.object({
  personal: personalSchema,
  academic: academicSchema,
  contact: contactSchema,
  family: familySchema,
  educational: educationalSchema,
})

type StudentFormValues = z.infer<typeof studentFullSchema>

// Helpers to clean empty strings to undefined/null before sending
const cleanData = (values: StudentFormValues): StudentRequest => {
  return {
    personal: {
      ...values.personal,
      middleName: values.personal.middleName || undefined,
      suffix: values.personal.suffix || undefined,
      birthplace: values.personal.birthplace || undefined,
      civilStatus: values.personal.civilStatus || undefined,
      nationality: values.personal.nationality || undefined,
      religion: values.personal.religion || undefined,
    },
    academic: {
      ...values.academic,
    },
    contact: {
      ...values.contact,
      mobileNumber: values.contact.mobileNumber || undefined,
      telephoneNumber: values.contact.telephoneNumber || undefined,
      emailAddress: values.contact.emailAddress || undefined,
      currentAddress: values.contact.currentAddress || undefined,
      permanentAddress: values.contact.permanentAddress || undefined,
      currentRegionCode: values.contact.currentRegionCode || undefined,
      currentRegionName: values.contact.currentRegionName || undefined,
      currentProvinceCode: values.contact.currentProvinceCode || undefined,
      currentProvinceName: values.contact.currentProvinceName || undefined,
      currentCityMunicipalityCode: values.contact.currentCityMunicipalityCode || undefined,
      currentCityMunicipalityName: values.contact.currentCityMunicipalityName || undefined,
      currentBarangayCode: values.contact.currentBarangayCode || undefined,
      currentBarangayName: values.contact.currentBarangayName || undefined,
      currentZipCode: values.contact.currentZipCode || undefined,
      permanentRegionCode: values.contact.permanentRegionCode || undefined,
      permanentRegionName: values.contact.permanentRegionName || undefined,
      permanentProvinceCode: values.contact.permanentProvinceCode || undefined,
      permanentProvinceName: values.contact.permanentProvinceName || undefined,
      permanentCityMunicipalityCode: values.contact.permanentCityMunicipalityCode || undefined,
      permanentCityMunicipalityName: values.contact.permanentCityMunicipalityName || undefined,
      permanentBarangayCode: values.contact.permanentBarangayCode || undefined,
      permanentBarangayName: values.contact.permanentBarangayName || undefined,
      permanentZipCode: values.contact.permanentZipCode || undefined,
      emergencyContactName: values.contact.emergencyContactName || undefined,
      emergencyContactNumber: values.contact.emergencyContactNumber || undefined,
      emergencyContactRelationship: values.contact.emergencyContactRelationship || undefined,
      emergencyContactAddress: values.contact.emergencyContactAddress || undefined,
    },
    family: {
      ...values.family,
      fatherName: values.family.fatherName || undefined,
      fatherOccupation: values.family.fatherOccupation || undefined,
      fatherContactNumber: values.family.fatherContactNumber || undefined,
      motherName: values.family.motherName || undefined,
      motherOccupation: values.family.motherOccupation || undefined,
      motherContactNumber: values.family.motherContactNumber || undefined,
      guardianName: values.family.guardianName || undefined,
      guardianRelationship: values.family.guardianRelationship || undefined,
      guardianContactNumber: values.family.guardianContactNumber || undefined,
      guardianAddress: values.family.guardianAddress || undefined,
      householdIncomeRange: values.family.householdIncomeRange || undefined,
    },
    educational: {
      ...values.educational,
      elementarySchoolName: values.educational.elementarySchoolName || undefined,
      elementarySchoolAddress: values.educational.elementarySchoolAddress || undefined,
      elementaryYearGraduated: values.educational.elementaryYearGraduated || undefined,
      juniorHighSchoolName: values.educational.juniorHighSchoolName || undefined,
      juniorHighSchoolAddress: values.educational.juniorHighSchoolAddress || undefined,
      juniorHighSchoolYearGraduated: values.educational.juniorHighSchoolYearGraduated || undefined,
      seniorHighSchoolName: values.educational.seniorHighSchoolName || undefined,
      seniorHighSchoolAddress: values.educational.seniorHighSchoolAddress || undefined,
      seniorHighSchoolStrand: values.educational.seniorHighSchoolStrand || undefined,
      seniorHighSchoolYearGraduated: values.educational.seniorHighSchoolYearGraduated || undefined,
      previousCollege: values.educational.previousCollege || undefined,
      previousProgram: values.educational.previousProgram || undefined,
      previousSchoolYearAttended: values.educational.previousSchoolYearAttended || undefined,
    },
  }
}

// Format utilities
function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function formatDate(dateString?: string) {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// --- MAIN PAGE COMPONENT ---

export function StudentsPage() {
  const [search, setSearch] = useState("")
  const [programId, setProgramId] = useState("")
  const [yearLevel, setYearLevel] = useState<number | undefined>(undefined)
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(0)
  const size = 10

  const navigate = useNavigate()

  const students = useStudents(
    {
      search: search || undefined,
      programId: programId || undefined,
      yearLevel: yearLevel || undefined,
      status: status || undefined,
    },
    page,
    size
  )

  const programsQuery = usePrograms("", 0, 100)
  const programs = programsQuery.data?.items || []

  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-7">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b1f3a]">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search and review registrar student records.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
          <UserPlus className="mr-2 h-4 w-4" /> New Student
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search student number, name, or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>

        <div>
          <Select
            value={programId}
            onValueChange={(val) => {
              setProgramId(val)
              setPage(0)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_PROGRAMS">All Programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.programCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={yearLevel === undefined ? "ALL_YEARS" : String(yearLevel)}
            onValueChange={(val) => {
              setYearLevel(val === "ALL_YEARS" ? undefined : Number(val))
              setPage(0)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Year Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_YEARS">All Year Levels</SelectItem>
              <SelectItem value="1">Year 1</SelectItem>
              <SelectItem value="2">Year 2</SelectItem>
              <SelectItem value="3">Year 3</SelectItem>
              <SelectItem value="4">Year 4</SelectItem>
              <SelectItem value="5">Year 5</SelectItem>
              <SelectItem value="6">Year 6</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val)
              setPage(0)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_STATUS">All Statuses</SelectItem>
              <SelectItem value="APPLICANT">APPLICANT</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="ENROLLED">ENROLLED</SelectItem>
              <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              <SelectItem value="DROPPED">DROPPED</SelectItem>
              <SelectItem value="TRANSFERRED">TRANSFERRED</SelectItem>
              <SelectItem value="GRADUATED">GRADUATED</SelectItem>
              <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                  Loading students...
                </TableCell>
              </TableRow>
            ) : students.data?.items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <p className="font-medium text-[#0b1f3a]">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">{s.studentNumber} · {s.emailAddress || "No email"}</p>
                </TableCell>
                <TableCell>{s.programCode}</TableCell>
                <TableCell>{s.yearLevel}</TableCell>
                <TableCell>
                  <Badge variant={s.status === "ACTIVE" || s.status === "ENROLLED" ? "default" : "secondary"}>
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${s.id}`)}>
                    View profile
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!students.isLoading && !students.data?.items.length && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!students.isLoading && (students.data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {students.data?.totalPages ?? 1} ({students.data?.totalElements ?? 0} total students)
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min((students.data?.totalPages ?? 1) - 1, p + 1))}
              disabled={page >= (students.data?.totalPages ?? 1) - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateStudentDialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  )
}

// --- CREATE STUDENT DIALOG ---

function CreateStudentDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const createMutation = useCreateStudent()
  const [sameAsCurrent, setSameAsCurrent] = useState(false)

  const programsQuery = usePrograms("", 0, 100)
  const curriculaQuery = useCurricula("", 0, 1000)
  const schoolYearsQuery = useSchoolYears(0, 100)
  const programs = programsQuery.data?.items || []

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFullSchema) as any,
    defaultValues: {
      personal: {
        studentNumber: "",
        firstName: "",
        middleName: "",
        lastName: "",
        suffix: "",
        gender: "MALE",
        birthdate: "",
        birthplace: "",
        civilStatus: "SINGLE",
        nationality: "Filipino",
        religion: "Roman Catholic",
        status: "APPLICANT",
      },
      academic: {
        programId: "",
        curriculumId: "",
        yearLevel: 1,
        dateAdmitted: new Date().toISOString().split("T")[0],
        schoolYearAdmitted: "",
        classification: "REGULAR",
        academicStatus: "REGULAR",
      },
      contact: {
        mobileNumber: "",
        telephoneNumber: "",
        emailAddress: "",
        currentAddress: "",
        permanentAddress: "",
        currentRegionCode: "",
        currentRegionName: "",
        currentProvinceCode: "",
        currentProvinceName: "",
        currentCityMunicipalityCode: "",
        currentCityMunicipalityName: "",
        currentBarangayCode: "",
        currentBarangayName: "",
        currentZipCode: "",
        permanentRegionCode: "",
        permanentRegionName: "",
        permanentProvinceCode: "",
        permanentProvinceName: "",
        permanentCityMunicipalityCode: "",
        permanentCityMunicipalityName: "",
        permanentBarangayCode: "",
        permanentBarangayName: "",
        permanentZipCode: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
        emergencyContactRelationship: "",
        emergencyContactAddress: "",
      },
      family: {
        fatherName: "",
        fatherOccupation: "",
        fatherContactNumber: "",
        motherName: "",
        motherOccupation: "",
        motherContactNumber: "",
        guardianName: "",
        guardianRelationship: "",
        guardianContactNumber: "",
        guardianAddress: "",
        householdIncomeRange: "",
      },
      educational: {
        elementarySchoolName: "",
        elementarySchoolAddress: "",
        elementaryYearGraduated: undefined,
        juniorHighSchoolName: "",
        juniorHighSchoolAddress: "",
        juniorHighSchoolYearGraduated: undefined,
        seniorHighSchoolName: "",
        seniorHighSchoolAddress: "",
        seniorHighSchoolStrand: "",
        seniorHighSchoolYearGraduated: undefined,
        previousCollege: "",
        previousProgram: "",
        previousSchoolYearAttended: "",
        admissionType: "NEW_STUDENT",
      },
    },
  })

  const setContactAddress = (kind: "current" | "permanent", address: AddressValues) => {
    setValue(`contact.${kind}Address`, address.houseStreet)
    setValue(`contact.${kind}RegionCode`, address.regionCode)
    setValue(`contact.${kind}RegionName`, address.regionName)
    setValue(`contact.${kind}ProvinceCode`, address.provinceCode)
    setValue(`contact.${kind}ProvinceName`, address.provinceName)
    setValue(`contact.${kind}CityMunicipalityCode`, address.cityMunicipalityCode)
    setValue(`contact.${kind}CityMunicipalityName`, address.cityMunicipalityName)
    setValue(`contact.${kind}BarangayCode`, address.barangayCode)
    setValue(`contact.${kind}BarangayName`, address.barangayName)
    setValue(`contact.${kind}ZipCode`, address.zipCode)
  }

  const currentAddressValues: AddressValues = {
    houseStreet: watch("contact.currentAddress") || "",
    regionCode: watch("contact.currentRegionCode") || "",
    regionName: watch("contact.currentRegionName") || "",
    provinceCode: watch("contact.currentProvinceCode") || "",
    provinceName: watch("contact.currentProvinceName") || "",
    cityMunicipalityCode: watch("contact.currentCityMunicipalityCode") || "",
    cityMunicipalityName: watch("contact.currentCityMunicipalityName") || "",
    barangayCode: watch("contact.currentBarangayCode") || "",
    barangayName: watch("contact.currentBarangayName") || "",
    zipCode: watch("contact.currentZipCode") || "",
  }
  const permanentAddressValues: AddressValues = {
    houseStreet: watch("contact.permanentAddress") || "",
    regionCode: watch("contact.permanentRegionCode") || "",
    regionName: watch("contact.permanentRegionName") || "",
    provinceCode: watch("contact.permanentProvinceCode") || "",
    provinceName: watch("contact.permanentProvinceName") || "",
    cityMunicipalityCode: watch("contact.permanentCityMunicipalityCode") || "",
    cityMunicipalityName: watch("contact.permanentCityMunicipalityName") || "",
    barangayCode: watch("contact.permanentBarangayCode") || "",
    barangayName: watch("contact.permanentBarangayName") || "",
    zipCode: watch("contact.permanentZipCode") || "",
  }

  // Watch program to filter curricula and sections
  const selectedProgramId = watch("academic.programId")

  const filteredCurricula = curriculaQuery.data?.items.filter((c) => c.programId === selectedProgramId) || []

  const onSubmit = async (values: StudentFormValues) => {
    try {
      const payload = cleanData(values)
      await createMutation.mutateAsync(payload)
      toast.success("Student created successfully")
      reset()
      setSameAsCurrent(false)
      onClose()
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err) => {
            setError(err.field as Path<StudentFormValues>, {
              type: "server",
              message: err.message,
            })
          })
          toast.error("Please check the form validation errors.")
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error("An unexpected error occurred.")
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#0b1f3a]">Create Student Record</DialogTitle>
          <DialogDescription>Fill in all fields across sections to register a new student.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-100 p-1 rounded-md">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="family">Family</TabsTrigger>
              <TabsTrigger value="educational">Education</TabsTrigger>
            </TabsList>

            {/* PERSONAL DETAILS */}
            <TabsContent value="personal" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Student Number *</Label>
                  <Input {...register("personal.studentNumber")} placeholder="e.g. 2026-0001" />
                  {errors.personal?.studentNumber?.message && (
                    <p className="text-xs text-destructive">{errors.personal.studentNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input {...register("personal.firstName")} />
                  {errors.personal?.firstName?.message && (
                    <p className="text-xs text-destructive">{errors.personal.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Middle Name</Label>
                  <Input {...register("personal.middleName")} />
                </div>

                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input {...register("personal.lastName")} />
                  {errors.personal?.lastName?.message && (
                    <p className="text-xs text-destructive">{errors.personal.lastName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Suffix</Label>
                  <Input {...register("personal.suffix")} placeholder="Jr., III, etc." />
                </div>

                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Controller
                    control={control}
                    name="personal.gender"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">MALE</SelectItem>
                          <SelectItem value="FEMALE">FEMALE</SelectItem>
                          <SelectItem value="OTHER">OTHER</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Birthdate *</Label>
                  <Input type="date" {...register("personal.birthdate")} />
                  {errors.personal?.birthdate?.message && (
                    <p className="text-xs text-destructive">{errors.personal.birthdate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Birthplace</Label>
                  <Input {...register("personal.birthplace")} />
                </div>

                <div className="space-y-2">
                  <Label>Civil Status</Label>
                  <Controller
                    control={control}
                    name="personal.civilStatus"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Civil Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SINGLE">Single</SelectItem>
                          <SelectItem value="MARRIED">Married</SelectItem>
                          <SelectItem value="WIDOWED">Widowed</SelectItem>
                          <SelectItem value="SEPARATED">Separated</SelectItem>
                          <SelectItem value="DIVORCED">Divorced</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input {...register("personal.nationality")} />
                </div>

                <div className="space-y-2">
                  <Label>Religion</Label>
                  <Input {...register("personal.religion")} />
                </div>

                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Controller
                    control={control}
                    name="personal.status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPLICANT">APPLICANT</SelectItem>
                          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                          <SelectItem value="ENROLLED">ENROLLED</SelectItem>
                          <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                          <SelectItem value="DROPPED">DROPPED</SelectItem>
                          <SelectItem value="TRANSFERRED">TRANSFERRED</SelectItem>
                          <SelectItem value="GRADUATED">GRADUATED</SelectItem>
                          <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ACADEMIC DETAILS */}
            <TabsContent value="academic" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Controller
                    control={control}
                    name="academic.programId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(val) => {
                        field.onChange(val);
                        setValue("academic.curriculumId", "");
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.programCode} - {p.programName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.academic?.programId?.message && (
                    <p className="text-xs text-destructive">{errors.academic.programId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Curriculum *</Label>
                  <Controller
                    control={control}
                    name="academic.curriculumId"
                    render={({ field }) => (
                      <Select disabled={!selectedProgramId} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedProgramId ? "Select Curriculum" : "Select Program First"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCurricula.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.curriculumCode} ({c.effectiveSchoolYear})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.academic?.curriculumId?.message && (
                    <p className="text-xs text-destructive">{errors.academic.curriculumId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Year Level *</Label>
                  <Controller
                    control={control}
                    name="academic.yearLevel"
                    render={({ field }) => (
                      <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Year Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Year 1</SelectItem>
                          <SelectItem value="2">Year 2</SelectItem>
                          <SelectItem value="3">Year 3</SelectItem>
                          <SelectItem value="4">Year 4</SelectItem>
                          <SelectItem value="5">Year 5</SelectItem>
                          <SelectItem value="6">Year 6</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.academic?.yearLevel?.message && (
                    <p className="text-xs text-destructive">{errors.academic.yearLevel.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Date Admitted *</Label>
                  <Input type="date" {...register("academic.dateAdmitted")} />
                  {errors.academic?.dateAdmitted?.message && (
                    <p className="text-xs text-destructive">{errors.academic.dateAdmitted.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>School Year Admitted *</Label>
                  <Controller
                    control={control}
                    name="academic.schoolYearAdmitted"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select School Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {schoolYearsQuery.data?.items.map((sy) => (
                            <SelectItem key={sy.id} value={sy.schoolYear}>
                              {sy.schoolYear}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.academic?.schoolYearAdmitted?.message && (
                    <p className="text-xs text-destructive">{errors.academic.schoolYearAdmitted.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Classification</Label>
                  <Controller
                    control={control}
                    name="academic.classification"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">REGULAR</SelectItem>
                          <SelectItem value="IRREGULAR">IRREGULAR</SelectItem>
                          <SelectItem value="TRANSFEREE">TRANSFEREE</SelectItem>
                          <SelectItem value="RETURNEE">RETURNEE</SelectItem>
                          <SelectItem value="CROSS_ENROLLEE">CROSS_ENROLLEE</SelectItem>
                          <SelectItem value="GRADUATING">GRADUATING</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Academic Status</Label>
                  <Controller
                    control={control}
                    name="academic.academicStatus"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Academic Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">REGULAR</SelectItem>
                          <SelectItem value="IRREGULAR">IRREGULAR</SelectItem>
                          <SelectItem value="PROBATION">PROBATION</SelectItem>
                          <SelectItem value="CANDIDATE_FOR_GRADUATION">CANDIDATE_FOR_GRADUATION</SelectItem>
                          <SelectItem value="GRADUATED">GRADUATED</SelectItem>
                          <SelectItem value="DISMISSED">DISMISSED</SelectItem>
                          <SelectItem value="ON_LEAVE">ON_LEAVE</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            {/* CONTACT DETAILS */}
            <TabsContent value="contact" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <Input {...register("contact.mobileNumber")} />
                </div>
                <div className="space-y-2">
                  <Label>Telephone Number</Label>
                  <Input {...register("contact.telephoneNumber")} />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" {...register("contact.emailAddress")} />
                  {errors.contact?.emailAddress?.message && (
                    <p className="text-xs text-destructive">{errors.contact.emailAddress.message}</p>
                  )}
                </div>
                <DualAddressFields
                  current={currentAddressValues}
                  permanent={permanentAddressValues}
                  sameAsCurrent={sameAsCurrent}
                  onCurrentChange={(address) => {
                    setContactAddress("current", address)
                    if (sameAsCurrent) setContactAddress("permanent", address)
                  }}
                  onPermanentChange={(address) => setContactAddress("permanent", address)}
                  onSameAsCurrentChange={(checked) => {
                    setSameAsCurrent(checked)
                    if (checked) setContactAddress("permanent", currentAddressValues)
                  }}
                />

                <div className="col-span-full border-t pt-4 mt-2">
                  <h4 className="font-medium text-[#0b1f3a] mb-3 text-sm">Emergency Contact Information</h4>
                </div>

                <div className="space-y-2">
                  <Label>Emergency Contact Name</Label>
                  <Input {...register("contact.emergencyContactName")} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact Number</Label>
                  <Input {...register("contact.emergencyContactNumber")} />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input {...register("contact.emergencyContactRelationship")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Input {...register("contact.emergencyContactAddress")} />
                </div>
              </div>
            </TabsContent>

            {/* FAMILY BACKGROUND */}
            <TabsContent value="family" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Father's Name</Label>
                  <Input {...register("family.fatherName")} />
                </div>
                <div className="space-y-2">
                  <Label>Father's Occupation</Label>
                  <Input {...register("family.fatherOccupation")} />
                </div>
                <div className="space-y-2">
                  <Label>Father's Contact Number</Label>
                  <Input {...register("family.fatherContactNumber")} />
                </div>

                <div className="space-y-2">
                  <Label>Mother's Name</Label>
                  <Input {...register("family.motherName")} />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Occupation</Label>
                  <Input {...register("family.motherOccupation")} />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Contact Number</Label>
                  <Input {...register("family.motherContactNumber")} />
                </div>

                <div className="space-y-2">
                  <Label>Guardian's Name</Label>
                  <Input {...register("family.guardianName")} />
                </div>
                <div className="space-y-2">
                  <Label>Guardian's Relationship</Label>
                  <Input {...register("family.guardianRelationship")} />
                </div>
                <div className="space-y-2">
                  <Label>Guardian's Contact Number</Label>
                  <Input {...register("family.guardianContactNumber")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Guardian's Address</Label>
                  <Input {...register("family.guardianAddress")} />
                </div>
                <div className="space-y-2">
                  <Label>Household Income Range</Label>
                  <Input {...register("family.householdIncomeRange")} placeholder="e.g. Php 20k - 50k" />
                </div>
              </div>
            </TabsContent>

            {/* EDUCATIONAL BACKGROUND */}
            <TabsContent value="educational" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Elementary School Name</Label>
                  <Input {...register("educational.elementarySchoolName")} />
                </div>
                <div className="space-y-2">
                  <Label>Elementary School Address</Label>
                  <Input {...register("educational.elementarySchoolAddress")} />
                </div>
                <div className="space-y-2">
                  <Label>Elementary Year Graduated</Label>
                  <Input type="number" {...register("educational.elementaryYearGraduated")} />
                </div>

                <div className="space-y-2">
                  <Label>Junior High School Name</Label>
                  <Input {...register("educational.juniorHighSchoolName")} />
                </div>
                <div className="space-y-2">
                  <Label>Junior High School Address</Label>
                  <Input {...register("educational.juniorHighSchoolAddress")} />
                </div>
                <div className="space-y-2">
                  <Label>Junior High Year Graduated</Label>
                  <Input type="number" {...register("educational.juniorHighSchoolYearGraduated")} />
                </div>

                <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Senior High School Name</Label>
                    <Input {...register("educational.seniorHighSchoolName")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Senior High School Address</Label>
                    <Input {...register("educational.seniorHighSchoolAddress")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Strand</Label>
                    <Input {...register("educational.seniorHighSchoolStrand")} placeholder="e.g. STEM, ABM" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senior High Year Graduated</Label>
                    <Input type="number" {...register("educational.seniorHighSchoolYearGraduated")} />
                  </div>
                </div>

                <div className="col-span-full border-t pt-4 mt-2">
                  <h4 className="font-medium text-[#0b1f3a] mb-3 text-sm">Previous Higher Education (for Transferees)</h4>
                </div>

                <div className="space-y-2">
                  <Label>Previous College</Label>
                  <Input {...register("educational.previousCollege")} />
                </div>
                <div className="space-y-2">
                  <Label>Previous Program</Label>
                  <Input {...register("educational.previousProgram")} />
                </div>
                <div className="space-y-2">
                  <Label>Previous School Year Attended</Label>
                  <Input {...register("educational.previousSchoolYearAttended")} />
                </div>

              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- STUDENT DETAIL PAGE ---

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const studentQuery = useStudent(id || "")
  const updateMutation = useUpdateStudent()

  const [editingSection, setEditingSection] = useState<
    "personal" | "academic" | "contact" | "family" | "educational" | null
  >(null)

  if (studentQuery.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground text-center">Loading student profile…</div>
  }

  if (!studentQuery.data || !id) {
    return <div className="p-8 text-center text-muted-foreground">Student could not be loaded.</div>
  }

  const s = studentQuery.data

  const handleSaveSection = async (
    section: "personal" | "academic" | "contact" | "family" | "educational",
    sectionValues: any
  ) => {
    try {
      // Build full payload for the update API
      const payload: StudentRequest = {
        personal:
          section === "personal"
            ? sectionValues
            : {
                studentNumber: s.personal.studentNumber,
                firstName: s.personal.firstName,
                middleName: s.personal.middleName || undefined,
                lastName: s.personal.lastName,
                suffix: s.personal.suffix || undefined,
                gender: s.personal.gender || "MALE",
                birthdate: s.personal.birthdate || "",
                birthplace: s.personal.birthplace || undefined,
                civilStatus: s.personal.civilStatus || undefined,
                nationality: s.personal.nationality || undefined,
                religion: s.personal.religion || undefined,
                status: s.personal.status,
              },
        academic:
          section === "academic"
            ? sectionValues
            : {
                programId: s.academic.programId,
                curriculumId: s.academic.curriculumId,
                yearLevel: s.academic.yearLevel,
                dateAdmitted: s.academic.dateAdmitted,
                schoolYearAdmitted: s.academic.schoolYearAdmitted,
                classification: s.academic.classification || undefined,
                academicStatus: s.academic.academicStatus || undefined,
              },
        contact:
          section === "contact"
            ? sectionValues
            : s.contact
              ? {
                  mobileNumber: s.contact.mobileNumber || undefined,
                  telephoneNumber: s.contact.telephoneNumber || undefined,
                  emailAddress: s.contact.emailAddress || undefined,
                  currentAddress: s.contact.currentAddress || undefined,
                  permanentAddress: s.contact.permanentAddress || undefined,
                  currentRegionCode: s.contact.currentRegionCode || undefined,
                  currentRegionName: s.contact.currentRegionName || undefined,
                  currentProvinceCode: s.contact.currentProvinceCode || undefined,
                  currentProvinceName: s.contact.currentProvinceName || undefined,
                  currentCityMunicipalityCode: s.contact.currentCityMunicipalityCode || undefined,
                  currentCityMunicipalityName: s.contact.currentCityMunicipalityName || undefined,
                  currentBarangayCode: s.contact.currentBarangayCode || undefined,
                  currentBarangayName: s.contact.currentBarangayName || undefined,
                  currentZipCode: s.contact.currentZipCode || undefined,
                  permanentRegionCode: s.contact.permanentRegionCode || undefined,
                  permanentRegionName: s.contact.permanentRegionName || undefined,
                  permanentProvinceCode: s.contact.permanentProvinceCode || undefined,
                  permanentProvinceName: s.contact.permanentProvinceName || undefined,
                  permanentCityMunicipalityCode: s.contact.permanentCityMunicipalityCode || undefined,
                  permanentCityMunicipalityName: s.contact.permanentCityMunicipalityName || undefined,
                  permanentBarangayCode: s.contact.permanentBarangayCode || undefined,
                  permanentBarangayName: s.contact.permanentBarangayName || undefined,
                  permanentZipCode: s.contact.permanentZipCode || undefined,
                  emergencyContactName: s.contact.emergencyContactName || undefined,
                  emergencyContactNumber: s.contact.emergencyContactNumber || undefined,
                  emergencyContactRelationship: s.contact.emergencyContactRelationship || undefined,
                  emergencyContactAddress: s.contact.emergencyContactAddress || undefined,
                }
              : undefined,
        family:
          section === "family"
            ? sectionValues
            : s.family
              ? {
                  fatherName: s.family.fatherName || undefined,
                  fatherOccupation: s.family.fatherOccupation || undefined,
                  fatherContactNumber: s.family.fatherContactNumber || undefined,
                  motherName: s.family.motherName || undefined,
                  motherOccupation: s.family.motherOccupation || undefined,
                  motherContactNumber: s.family.motherContactNumber || undefined,
                  guardianName: s.family.guardianName || undefined,
                  guardianRelationship: s.family.guardianRelationship || undefined,
                  guardianContactNumber: s.family.guardianContactNumber || undefined,
                  guardianAddress: s.family.guardianAddress || undefined,
                  householdIncomeRange: s.family.householdIncomeRange || undefined,
                }
              : undefined,
        educational:
          section === "educational"
            ? sectionValues
            : s.educational
              ? {
                  elementarySchoolName: s.educational.elementarySchoolName || undefined,
                  elementarySchoolAddress: s.educational.elementarySchoolAddress || undefined,
                  elementaryYearGraduated: s.educational.elementaryYearGraduated || undefined,
                  juniorHighSchoolName: s.educational.juniorHighSchoolName || undefined,
                  juniorHighSchoolAddress: s.educational.juniorHighSchoolAddress || undefined,
                  juniorHighSchoolYearGraduated: s.educational.juniorHighSchoolYearGraduated || undefined,
                  seniorHighSchoolName: s.educational.seniorHighSchoolName || undefined,
                  seniorHighSchoolAddress: s.educational.seniorHighSchoolAddress || undefined,
                  seniorHighSchoolStrand: s.educational.seniorHighSchoolStrand || undefined,
                  seniorHighSchoolYearGraduated: s.educational.seniorHighSchoolYearGraduated || undefined,
                  previousCollege: s.educational.previousCollege || undefined,
                  previousProgram: s.educational.previousProgram || undefined,
                  previousSchoolYearAttended: s.educational.previousSchoolYearAttended || undefined,
                  admissionType: s.educational.admissionType || "NEW_STUDENT",
                }
              : undefined,
      }

      await updateMutation.mutateAsync({ id, data: payload })
      toast.success(`${section.toUpperCase()} details updated successfully`)
      setEditingSection(null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Failed to update student profile section.")
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-7">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to students
      </Button>

      <div className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b1f3a]">{s.personal.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {s.personal.studentNumber} · {s.academic.programCode} · Year {s.academic.yearLevel}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void openPdf(`/reports/students/${id}/profile`)}>
            <Download className="mr-2 h-4 w-4" /> Profile PDF
          </Button>
          <Button variant="outline" onClick={() => void openPdf(`/reports/students/${id}/curriculum-checklist`)}>
            <FileText className="mr-2 h-4 w-4" /> Curriculum
          </Button>
        </div>
      </div>

      <Tabs defaultValue="personal" className="mt-6">
        <TabsList className="bg-slate-100 p-1 rounded-md">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="current-enrollment">Current Enrollment</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* PERSONAL DETAILS TAB */}
        <TabsContent value="personal" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-[#0b1f3a]">Personal Details</h3>
            <Button onClick={() => setEditingSection("personal")} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
          <InfoGrid data={s.personal} />
        </TabsContent>

        {/* ACADEMIC DETAILS TAB */}
        <TabsContent value="academic" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-[#0b1f3a]">Academic Assignment</h3>
            <Button onClick={() => setEditingSection("academic")} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
          <InfoGrid data={s.academic} />
          <AcademicRecordsTable studentId={id} />
        </TabsContent>

        {/* CURRENT ENROLLMENT TAB */}
        <TabsContent value="current-enrollment" className="space-y-4 pt-4">
          <CurrentEnrollmentTab studentId={id} />
        </TabsContent>

        {/* CONTACT DETAILS TAB */}
        <TabsContent value="contact" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-[#0b1f3a]">Contact & Emergency details</h3>
            <Button onClick={() => setEditingSection("contact")} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
          <InfoGrid data={s.contact || {}} />
        </TabsContent>

        {/* FAMILY DETAILS TAB */}
        <TabsContent value="family" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-[#0b1f3a]">Family Background</h3>
            <Button onClick={() => setEditingSection("family")} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
          <InfoGrid data={s.family || {}} />
        </TabsContent>

        {/* EDUCATIONAL DETAILS TAB */}
        <TabsContent value="education" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-[#0b1f3a]">Educational Background</h3>
            <Button onClick={() => setEditingSection("educational")} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
          <InfoGrid data={s.educational || {}} />
        </TabsContent>

        {/* DOCUMENTS MANAGEMENT TAB */}
        <TabsContent value="documents" className="space-y-4 pt-4">
          <DocumentsTab studentId={id} />
        </TabsContent>
      </Tabs>

      {/* Edit Section Modal */}
      {editingSection && (
        <EditSectionDialog
          section={editingSection}
          student={s}
          isOpen={!!editingSection}
          onClose={() => setEditingSection(null)}
          onSave={(values) => handleSaveSection(editingSection, values)}
        />
      )}
    </div>
  )
}

// --- INFO GRID DISPLAY ---

function InfoGrid({ data }: { data?: any }) {
  const filtered = Object.entries(data ?? {}).filter(
    ([k, v]) => v !== null && v !== "" && k !== "id" && k !== "programId" && k !== "curriculumId" && !(k.endsWith("Code") && !k.toLowerCase().includes("zip"))
  )

  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map(([k, v]) => (
        <div key={k} className="bg-white p-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {k.replace(/([A-Z])/g, " $1")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-[#0b1f3a]">
            {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v).replaceAll("_", " ")}
          </dd>
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="bg-white p-6 text-center text-sm text-muted-foreground col-span-full">No details provided.</div>
      )}
    </dl>
  )
}

// --- ACADEMIC RECORDS TABLE ---

function AcademicRecordsTable({ studentId }: { studentId: string }) {
  const { data, isLoading } = useStudentAcademicRecords(studentId)

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground text-center">Loading academic records...</div>
  }

  const records = data?.records || []

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-lg font-medium text-[#0b1f3a]">Academic Records & Grades</h3>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>School Year / Semester</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium text-[#0b1f3a]">{r.courseTitle}</p>
                  <p className="text-xs text-muted-foreground">{r.courseCode}</p>
                </TableCell>
                <TableCell>
                  {r.creditUnits} (Earned: {r.earnedUnits})
                </TableCell>
                <TableCell className="font-semibold text-[#0b1f3a]">
                  {r.finalGrade !== undefined && r.finalGrade !== null ? r.finalGrade.toFixed(2) : "—"}
                </TableCell>
                <TableCell>
                  {r.remarks ? (
                    <Badge variant={r.remarks === "PASSED" ? "default" : "destructive"}>{r.remarks}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{r.sectionCode || "—"}</TableCell>
                <TableCell>
                  {r.schoolYear} · {r.semesterName}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.gradeStatus}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No academic records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// --- DOCUMENT TAB & MANAGEMENT ---

function DocumentsTab({ studentId }: { studentId: string }) {
  const { data, isLoading } = useStudentDocuments(studentId)
  const uploadMutation = useUploadStudentDocument(studentId)
  const verifyMutation = useVerifyStudentDocument(studentId)

  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [verifyingDoc, setVerifyingDoc] = useState<StudentDocumentResponse | null>(null)

  // Upload Form
  const { register: regUpload, handleSubmit: handleUploadSubmit, reset: resetUpload } = useForm<{
    documentType: string
    remarks: string
    file: FileList
  }>()

  // Verify Form
  const { register: regVerify, handleSubmit: handleVerifySubmit, reset: resetVerify, setValue: setVerifyValue } = useForm<{
    status: DocumentVerificationStatus
    remarks: string
  }>()

  const onUploadSubmit = async (values: { documentType: string; remarks: string; file: FileList }) => {
    if (!values.file || values.file.length === 0) {
      toast.error("Please select a file to upload.")
      return
    }
    try {
      await uploadMutation.mutateAsync({
        file: values.file[0],
        documentType: values.documentType,
        remarks: values.remarks,
      })
      toast.success("Document uploaded successfully")
      resetUpload()
      setIsUploadOpen(false)
    } catch (err) {
      toast.error("Failed to upload document.")
    }
  }

  const onVerifySubmit = async (values: { status: DocumentVerificationStatus; remarks: string }) => {
    if (!verifyingDoc) return
    try {
      await verifyMutation.mutateAsync({
        documentId: verifyingDoc.id,
        status: values.status,
        remarks: values.remarks,
      })
      toast.success("Document verification updated")
      resetVerify()
      setVerifyingDoc(null)
    } catch (err) {
      toast.error("Failed to verify document.")
    }
  }

  const startVerify = (doc: StudentDocumentResponse) => {
    setVerifyingDoc(doc)
    setVerifyValue("status", doc.verificationStatus)
    setVerifyValue("remarks", doc.remarks || "")
  }

  const docs = data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-[#0b1f3a]">Student Documents</h3>
        <Button onClick={() => setIsUploadOpen(true)} className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
          <FileUp className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Type</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                  Loading documents...
                </TableCell>
              </TableRow>
            ) : docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium text-[#0b1f3a]">
                  {d.documentType.replaceAll("_", " ")}
                </TableCell>
                <TableCell>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      // Open PDF/File if possible, otherwise alert path
                      void openPdf(`/reports/students/documents/${d.id}`).catch(() => {
                        toast.error("Cannot display preview for this file type.")
                      })
                    }}
                    className="text-[#0969da] hover:underline"
                  >
                    {d.fileName}
                  </a>
                </TableCell>
                <TableCell>{formatBytes(d.fileSize)}</TableCell>
                <TableCell>{formatDate(d.verifiedAt || new Date().toISOString())}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      d.verificationStatus === "VERIFIED"
                        ? "default"
                        : d.verificationStatus === "REJECTED" || d.verificationStatus === "MISSING"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {d.verificationStatus}
                  </Badge>
                </TableCell>
                <TableCell>{d.remarks || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => startVerify(d)}>
                    Verify
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && docs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No documents uploaded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => !open && setIsUploadOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-[#0b1f3a]">Upload Student Document</DialogTitle>
            <DialogDescription>Upload required documents for verification.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit(onUploadSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <select
                {...regUpload("documentType")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                required
              >
                <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
                <option value="FORM_137">Form 137 (Permanent Record)</option>
                <option value="TRANSCRIPT_OF_RECORDS">Transcript of Records (TOR)</option>
                <option value="GOOD_MORAL_CHARACTER">Good Moral Character</option>
                <option value="DIPLOMA">Diploma</option>
                <option value="MARRIAGE_CONTRACT">Marriage Contract</option>
                <option value="CERTIFICATE_OF_TRANSFER">Certificate of Transfer</option>
                <option value="OTHERS">Others</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>File Upload</Label>
              <Input type="file" {...regUpload("file")} required />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input {...regUpload("remarks")} placeholder="Optional remarks" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
                Upload File
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={!!verifyingDoc} onOpenChange={(open) => !open && setVerifyingDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-[#0b1f3a]">Verify Document</DialogTitle>
            <DialogDescription>
              Update the verification status of <strong>{verifyingDoc?.fileName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerifySubmit(onVerifySubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Status</Label>
              <select
                {...regVerify("status")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                required
              >
                <option value="PENDING">PENDING</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="MISSING">MISSING</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Remarks / Feedback</Label>
              <Textarea {...regVerify("remarks")} placeholder="Add remarks detailing verification details..." />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setVerifyingDoc(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
                Update Verification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- EDIT SECTION DIALOG ---

interface EditSectionDialogProps {
  section: "personal" | "academic" | "contact" | "family" | "educational"
  student: StudentResponse
  isOpen: boolean
  onClose: () => void
  onSave: (values: any) => Promise<void>
}

function EditSectionDialog({ section, student, isOpen, onClose, onSave }: EditSectionDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [sameAsCurrent, setSameAsCurrent] = useState(false)

  const programsQuery = usePrograms("", 0, 100)
  const curriculaQuery = useCurricula("", 0, 1000)
  const schoolYearsQuery = useSchoolYears(0, 100)
  const programs = programsQuery.data?.items || []

  // Initialize correct values based on section
  const getDefaults = () => {
    switch (section) {
      case "personal":
        return {
          studentNumber: student.personal.studentNumber,
          firstName: student.personal.firstName,
          middleName: student.personal.middleName || "",
          lastName: student.personal.lastName,
          suffix: student.personal.suffix || "",
          gender: student.personal.gender || "MALE",
          birthdate: student.personal.birthdate || "",
          birthplace: student.personal.birthplace || "",
          civilStatus: student.personal.civilStatus || "",
          nationality: student.personal.nationality || "",
          religion: student.personal.religion || "",
          status: student.personal.status,
        }
      case "academic":
        return {
          programId: student.academic.programId,
          curriculumId: student.academic.curriculumId,
          yearLevel: student.academic.yearLevel,
          dateAdmitted: student.academic.dateAdmitted,
          schoolYearAdmitted: student.academic.schoolYearAdmitted,
          classification: student.academic.classification || "REGULAR",
          academicStatus: student.academic.academicStatus || "REGULAR",
        }
      case "contact":
        return {
          mobileNumber: student.contact?.mobileNumber || "",
          telephoneNumber: student.contact?.telephoneNumber || "",
          emailAddress: student.contact?.emailAddress || "",
          currentAddress: student.contact?.currentAddress || "",
          permanentAddress: student.contact?.permanentAddress || "",
          currentRegionCode: student.contact?.currentRegionCode || "",
          currentRegionName: student.contact?.currentRegionName || "",
          currentProvinceCode: student.contact?.currentProvinceCode || "",
          currentProvinceName: student.contact?.currentProvinceName || "",
          currentCityMunicipalityCode: student.contact?.currentCityMunicipalityCode || "",
          currentCityMunicipalityName: student.contact?.currentCityMunicipalityName || "",
          currentBarangayCode: student.contact?.currentBarangayCode || "",
          currentBarangayName: student.contact?.currentBarangayName || "",
          currentZipCode: student.contact?.currentZipCode || "",
          permanentRegionCode: student.contact?.permanentRegionCode || "",
          permanentRegionName: student.contact?.permanentRegionName || "",
          permanentProvinceCode: student.contact?.permanentProvinceCode || "",
          permanentProvinceName: student.contact?.permanentProvinceName || "",
          permanentCityMunicipalityCode: student.contact?.permanentCityMunicipalityCode || "",
          permanentCityMunicipalityName: student.contact?.permanentCityMunicipalityName || "",
          permanentBarangayCode: student.contact?.permanentBarangayCode || "",
          permanentBarangayName: student.contact?.permanentBarangayName || "",
          permanentZipCode: student.contact?.permanentZipCode || "",
          emergencyContactName: student.contact?.emergencyContactName || "",
          emergencyContactNumber: student.contact?.emergencyContactNumber || "",
          emergencyContactRelationship: student.contact?.emergencyContactRelationship || "",
          emergencyContactAddress: student.contact?.emergencyContactAddress || "",
        }
      case "family":
        return {
          fatherName: student.family?.fatherName || "",
          fatherOccupation: student.family?.fatherOccupation || "",
          fatherContactNumber: student.family?.fatherContactNumber || "",
          motherName: student.family?.motherName || "",
          motherOccupation: student.family?.motherOccupation || "",
          motherContactNumber: student.family?.motherContactNumber || "",
          guardianName: student.family?.guardianName || "",
          guardianRelationship: student.family?.guardianRelationship || "",
          guardianContactNumber: student.family?.guardianContactNumber || "",
          guardianAddress: student.family?.guardianAddress || "",
          householdIncomeRange: student.family?.householdIncomeRange || "",
        }
      case "educational":
        return {
          elementarySchoolName: student.educational?.elementarySchoolName || "",
          elementarySchoolAddress: student.educational?.elementarySchoolAddress || "",
          elementaryYearGraduated: student.educational?.elementaryYearGraduated || undefined,
          juniorHighSchoolName: student.educational?.juniorHighSchoolName || "",
          juniorHighSchoolAddress: student.educational?.juniorHighSchoolAddress || "",
          juniorHighSchoolYearGraduated: student.educational?.juniorHighSchoolYearGraduated || undefined,
          seniorHighSchoolName: student.educational?.seniorHighSchoolName || "",
          seniorHighSchoolAddress: student.educational?.seniorHighSchoolAddress || "",
          seniorHighSchoolStrand: student.educational?.seniorHighSchoolStrand || "",
          seniorHighSchoolYearGraduated: student.educational?.seniorHighSchoolYearGraduated || undefined,
          previousCollege: student.educational?.previousCollege || "",
          previousProgram: student.educational?.previousProgram || "",
          previousSchoolYearAttended: student.educational?.previousSchoolYearAttended || "",
          admissionType: student.educational?.admissionType || "NEW_STUDENT",
        }
    }
  }

  // Schema for validation based on section
  const getSchema = () => {
    switch (section) {
      case "personal":
        return personalSchema
      case "academic":
        return academicSchema
      case "contact":
        return contactSchema
      case "family":
        return familySchema
      case "educational":
        return educationalSchema
    }
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue: setEditValue,
    setError,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(getSchema()) as any,
    defaultValues: getDefaults(),
  })

  const setSectionAddress = (kind: "current" | "permanent", address: AddressValues) => {
    setEditValue(`${kind}Address`, address.houseStreet)
    setEditValue(`${kind}RegionCode`, address.regionCode)
    setEditValue(`${kind}RegionName`, address.regionName)
    setEditValue(`${kind}ProvinceCode`, address.provinceCode)
    setEditValue(`${kind}ProvinceName`, address.provinceName)
    setEditValue(`${kind}CityMunicipalityCode`, address.cityMunicipalityCode)
    setEditValue(`${kind}CityMunicipalityName`, address.cityMunicipalityName)
    setEditValue(`${kind}BarangayCode`, address.barangayCode)
    setEditValue(`${kind}BarangayName`, address.barangayName)
    setEditValue(`${kind}ZipCode`, address.zipCode)
  }
  const editCurrentAddress: AddressValues = {
    houseStreet: watch("currentAddress") || "",
    regionCode: watch("currentRegionCode") || "", regionName: watch("currentRegionName") || "",
    provinceCode: watch("currentProvinceCode") || "", provinceName: watch("currentProvinceName") || "",
    cityMunicipalityCode: watch("currentCityMunicipalityCode") || "", cityMunicipalityName: watch("currentCityMunicipalityName") || "",
    barangayCode: watch("currentBarangayCode") || "", barangayName: watch("currentBarangayName") || "",
    zipCode: watch("currentZipCode") || "",
  }
  const editPermanentAddress: AddressValues = {
    houseStreet: watch("permanentAddress") || "",
    regionCode: watch("permanentRegionCode") || "", regionName: watch("permanentRegionName") || "",
    provinceCode: watch("permanentProvinceCode") || "", provinceName: watch("permanentProvinceName") || "",
    cityMunicipalityCode: watch("permanentCityMunicipalityCode") || "", cityMunicipalityName: watch("permanentCityMunicipalityName") || "",
    barangayCode: watch("permanentBarangayCode") || "", barangayName: watch("permanentBarangayName") || "",
    zipCode: watch("permanentZipCode") || "",
  }

  const selectedProgramId = watch("programId")

  const filteredCurricula = curriculaQuery.data?.items.filter((c) => c.programId === selectedProgramId) || []

  const onSubmit = async (values: any) => {
    setSubmitting(true)
    try {
      // Map empty inputs to null/undefined before saving
      const cleaned: any = { ...values }
      Object.keys(cleaned).forEach((k) => {
        if (cleaned[k] === "") {
          cleaned[k] = undefined
        }
      })
      await onSave(cleaned)
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        err.errors.forEach((e) => {
          setError(e.field, { message: e.message })
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0b1f3a]">Edit {section.toUpperCase()} Information</DialogTitle>
          <DialogDescription>Modify fields below and click save.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* PERSONAL DETAILS FORM FIELDS */}
          {section === "personal" && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Student Number *</Label>
                <Input {...register("studentNumber")} />
                {!!errors.studentNumber?.message && <p className="text-xs text-destructive">{errors.studentNumber.message?.toString()}</p>}
              </div>
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input {...register("firstName")} />
                {!!errors.firstName?.message && <p className="text-xs text-destructive">{errors.firstName.message?.toString()}</p>}
              </div>
              <div className="space-y-2">
                <Label>Middle Name</Label>
                <Input {...register("middleName")} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input {...register("lastName")} />
                {!!errors.lastName?.message && <p className="text-xs text-destructive">{errors.lastName.message?.toString()}</p>}
              </div>
              <div className="space-y-2">
                <Label>Suffix</Label>
                <Input {...register("suffix")} />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">MALE</SelectItem>
                        <SelectItem value="FEMALE">FEMALE</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Birthdate *</Label>
                <Input type="date" {...register("birthdate")} />
                {!!errors.birthdate?.message && <p className="text-xs text-destructive">{errors.birthdate.message?.toString()}</p>}
              </div>
              <div className="space-y-2">
                <Label>Birthplace</Label>
                <Input {...register("birthplace")} />
              </div>
              <div className="space-y-2">
                <Label>Civil Status</Label>
                <Controller
                  control={control}
                  name="civilStatus"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Civil Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="MARRIED">Married</SelectItem>
                        <SelectItem value="WIDOWED">Widowed</SelectItem>
                        <SelectItem value="SEPARATED">Separated</SelectItem>
                        <SelectItem value="DIVORCED">Divorced</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input {...register("nationality")} />
              </div>
              <div className="space-y-2">
                <Label>Religion</Label>
                <Input {...register("religion")} />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPLICANT">APPLICANT</SelectItem>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="ENROLLED">ENROLLED</SelectItem>
                        <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        <SelectItem value="DROPPED">DROPPED</SelectItem>
                        <SelectItem value="TRANSFERRED">TRANSFERRED</SelectItem>
                        <SelectItem value="GRADUATED">GRADUATED</SelectItem>
                        <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          )}

          {/* ACADEMIC DETAILS FORM FIELDS */}
          {section === "academic" && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Program *</Label>
                <Controller
                  control={control}
                  name="programId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(val) => {
                      field.onChange(val);
                      setEditValue("curriculumId", "");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.programCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {!!errors.programId?.message && <p className="text-xs text-destructive">{errors.programId.message?.toString()}</p>}
              </div>

              <div className="space-y-2">
                <Label>Curriculum *</Label>
                <Controller
                  control={control}
                  name="curriculumId"
                  render={({ field }) => (
                    <Select disabled={!selectedProgramId} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Curriculum" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCurricula.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.curriculumCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {!!errors.curriculumId?.message && <p className="text-xs text-destructive">{errors.curriculumId.message?.toString()}</p>}
              </div>

              <div className="space-y-2">
                <Label>Year Level *</Label>
                <Controller
                  control={control}
                  name="yearLevel"
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                        <SelectItem value="5">Year 5</SelectItem>
                        <SelectItem value="6">Year 6</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {!!errors.yearLevel?.message && <p className="text-xs text-destructive">{errors.yearLevel.message?.toString()}</p>}
              </div>

              <div className="space-y-2">
                <Label>Date Admitted *</Label>
                <Input type="date" {...register("dateAdmitted")} />
                {!!errors.dateAdmitted?.message && <p className="text-xs text-destructive">{errors.dateAdmitted.message?.toString()}</p>}
              </div>

              <div className="space-y-2">
                <Label>School Year Admitted *</Label>
                <Controller
                  control={control}
                  name="schoolYearAdmitted"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="School Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolYearsQuery.data?.items.map((sy) => (
                          <SelectItem key={sy.id} value={sy.schoolYear}>
                            {sy.schoolYear}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {!!errors.schoolYearAdmitted?.message && (
                  <p className="text-xs text-destructive">{errors.schoolYearAdmitted.message?.toString()}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Classification</Label>
                <Controller
                  control={control}
                  name="classification"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Classification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGULAR">REGULAR</SelectItem>
                        <SelectItem value="IRREGULAR">IRREGULAR</SelectItem>
                        <SelectItem value="TRANSFEREE">TRANSFEREE</SelectItem>
                        <SelectItem value="RETURNEE">RETURNEE</SelectItem>
                        <SelectItem value="CROSS_ENROLLEE">CROSS_ENROLLEE</SelectItem>
                        <SelectItem value="GRADUATING">GRADUATING</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Academic Status</Label>
                <Controller
                  control={control}
                  name="academicStatus"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Academic Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGULAR">REGULAR</SelectItem>
                        <SelectItem value="IRREGULAR">IRREGULAR</SelectItem>
                        <SelectItem value="PROBATION">PROBATION</SelectItem>
                        <SelectItem value="CANDIDATE_FOR_GRADUATION">CANDIDATE_FOR_GRADUATION</SelectItem>
                        <SelectItem value="GRADUATED">GRADUATED</SelectItem>
                        <SelectItem value="DISMISSED">DISMISSED</SelectItem>
                        <SelectItem value="ON_LEAVE">ON_LEAVE</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          )}

          {/* CONTACT DETAILS FORM FIELDS */}
          {section === "contact" && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input {...register("mobileNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Telephone Number</Label>
                <Input {...register("telephoneNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" {...register("emailAddress")} />
                {!!errors.emailAddress?.message && <p className="text-xs text-destructive">{errors.emailAddress.message?.toString()}</p>}
              </div>
              <DualAddressFields
                current={editCurrentAddress}
                permanent={editPermanentAddress}
                sameAsCurrent={sameAsCurrent}
                onCurrentChange={(address) => {
                  setSectionAddress("current", address)
                  if (sameAsCurrent) setSectionAddress("permanent", address)
                }}
                onPermanentChange={(address) => setSectionAddress("permanent", address)}
                onSameAsCurrentChange={(checked) => {
                  setSameAsCurrent(checked)
                  if (checked) setSectionAddress("permanent", editCurrentAddress)
                }}
              />
              <div className="col-span-full border-t pt-2">
                <h4 className="font-semibold text-[#0b1f3a] text-sm">Emergency Contact Information</h4>
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input {...register("emergencyContactName")} />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input {...register("emergencyContactNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input {...register("emergencyContactRelationship")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input {...register("emergencyContactAddress")} />
              </div>
            </div>
          )}

          {/* FAMILY DETAILS FORM FIELDS */}
          {section === "family" && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Father's Name</Label>
                <Input {...register("fatherName")} />
              </div>
              <div className="space-y-2">
                <Label>Father's Occupation</Label>
                <Input {...register("fatherOccupation")} />
              </div>
              <div className="space-y-2">
                <Label>Father's Contact</Label>
                <Input {...register("fatherContactNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Mother's Name</Label>
                <Input {...register("motherName")} />
              </div>
              <div className="space-y-2">
                <Label>Mother's Occupation</Label>
                <Input {...register("motherOccupation")} />
              </div>
              <div className="space-y-2">
                <Label>Mother's Contact</Label>
                <Input {...register("motherContactNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Guardian's Name</Label>
                <Input {...register("guardianName")} />
              </div>
              <div className="space-y-2">
                <Label>Guardian's Relationship</Label>
                <Input {...register("guardianRelationship")} />
              </div>
              <div className="space-y-2">
                <Label>Guardian's Contact</Label>
                <Input {...register("guardianContactNumber")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Guardian's Address</Label>
                <Input {...register("guardianAddress")} />
              </div>
              <div className="space-y-2">
                <Label>Household Income Range</Label>
                <Input {...register("householdIncomeRange")} />
              </div>
            </div>
          )}

          {/* EDUCATIONAL DETAILS FORM FIELDS */}
          {section === "educational" && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Elementary School Name</Label>
                <Input {...register("elementarySchoolName")} />
              </div>
              <div className="space-y-2">
                <Label>Elementary School Address</Label>
                <Input {...register("elementarySchoolAddress")} />
              </div>
              <div className="space-y-2">
                <Label>Elementary Year Graduated</Label>
                <Input type="number" {...register("elementaryYearGraduated")} />
              </div>
              <div className="space-y-2">
                <Label>Junior High School Name</Label>
                <Input {...register("juniorHighSchoolName")} />
              </div>
              <div className="space-y-2">
                <Label>Junior High School Address</Label>
                <Input {...register("juniorHighSchoolAddress")} />
              </div>
              <div className="space-y-2">
                <Label>Junior High Year Graduated</Label>
                <Input type="number" {...register("juniorHighSchoolYearGraduated")} />
              </div>
              <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Senior High School Name</Label>
                  <Input {...register("seniorHighSchoolName")} />
                </div>
                <div className="space-y-2">
                  <Label>Senior High School Address</Label>
                  <Input {...register("seniorHighSchoolAddress")} />
                </div>
                <div className="space-y-2">
                  <Label>Strand</Label>
                  <Input {...register("seniorHighSchoolStrand")} />
                </div>
                <div className="space-y-2">
                  <Label>Senior High Year Graduated</Label>
                  <Input type="number" {...register("seniorHighSchoolYearGraduated")} />
                </div>
              </div>
              <div className="col-span-full border-t pt-2">
                <h4 className="font-semibold text-[#0b1f3a] text-sm">Previous Higher Education</h4>
              </div>
              <div className="space-y-2">
                <Label>Previous College</Label>
                <Input {...register("previousCollege")} />
              </div>
              <div className="space-y-2">
                <Label>Previous Program</Label>
                <Input {...register("previousProgram")} />
              </div>
              <div className="space-y-2">
                <Label>Previous School Year Attended</Label>
                <Input {...register("previousSchoolYearAttended")} />
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-[#0b1f3a] text-white hover:bg-[#0b1f3a]/90">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CurrentEnrollmentTab({ studentId }: { studentId: string }) {
  const { data: enrollment, isLoading } = useStudentLatestEnrollment(studentId)

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground text-center">Loading current enrollment...</div>
  }

  if (!enrollment) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center bg-slate-50/50">
        <p className="text-sm font-medium text-slate-900">No enrollment recorded for this student.</p>
        <p className="text-xs text-muted-foreground mt-1">This student has not been enrolled in any terms yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm p-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Enrollment Details</h4>
        <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Term</dt>
            <dd className="mt-1 text-sm font-semibold text-[#0b1f3a]">
              {enrollment.schoolYear} · {enrollment.semesterName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Year Level</dt>
            <dd className="mt-1 text-sm font-semibold text-[#0b1f3a]">Year {enrollment.yearLevel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Section Code</dt>
            <dd className="mt-1 text-sm font-semibold text-[#0b1f3a]">
              {enrollment.sectionCode || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Status</dt>
            <dd className="mt-1 text-sm">
              <Badge variant={enrollment.status === "CONFIRMED" ? "default" : "secondary"}>
                {enrollment.status}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <h4 className="text-base font-semibold text-[#0b1f3a]">Enrolled Subjects</h4>
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Code</TableHead>
                <TableHead>Descriptive Title</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Credit Units</TableHead>
                <TableHead>Schedule Meetings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollment.subjects.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-semibold">{sub.courseCode}</TableCell>
                  <TableCell>{sub.courseTitle}</TableCell>
                  <TableCell>{sub.sectionCode || "—"}</TableCell>
                  <TableCell>{sub.roomCode || "—"}</TableCell>
                  <TableCell>{sub.facultyName || "—"}</TableCell>
                  <TableCell>{sub.creditUnits}</TableCell>
                  <TableCell className="text-xs space-y-0.5 whitespace-nowrap">
                    {sub.meetings && sub.meetings.length > 0 ? (
                      sub.meetings.map((m, i) => (
                        <div key={i}>{m.dayOfWeek.slice(0,3)} {m.startTime.slice(0,5)}–{m.endTime.slice(0,5)}</div>
                      ))
                    ) : (
                      <span className="text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {enrollment.subjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No enrolled subjects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
