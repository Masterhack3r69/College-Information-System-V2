import { useCallback, useMemo, useState } from "react"
import { useSchoolYears, useSemesters } from "@/hooks/use-setup"
import { useAuth } from "@/lib/auth"
import { AcademicTermContext, formatSemesterName, type AcademicTermContextValue } from "@/lib/academic-term-context"

type StoredAcademicTerm = {
  schoolYearId?: string
  semesterId?: string
}

function readStoredTerm(key: string): StoredAcademicTerm {
  try {
    const value = sessionStorage.getItem(key)
    return value ? (JSON.parse(value) as StoredAcademicTerm) : {}
  } catch {
    return {}
  }
}

export function AcademicTermProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const schoolYearsQuery = useSchoolYears(0, 100)
  const semestersQuery = useSemesters(0, 100)
  const storageKey = `sis.academic-term.${user?.id ?? "anonymous"}`
  const [preferredTerm, setPreferredTerm] = useState<StoredAcademicTerm>(() => readStoredTerm(storageKey))

  const schoolYears = useMemo(
    () => [...(schoolYearsQuery.data?.items ?? [])].sort((left, right) => right.schoolYear.localeCompare(left.schoolYear)),
    [schoolYearsQuery.data?.items]
  )
  const semesters = useMemo(
    () => [...(semestersQuery.data?.items ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
    [semestersQuery.data?.items]
  )

  const schoolYear = schoolYears.find((item) => item.id === preferredTerm.schoolYearId)
    ?? schoolYears.find((item) => item.active)
    ?? schoolYears[0]
  const semester = semesters.find((item) => item.id === preferredTerm.semesterId)
    ?? semesters.find((item) => item.active)
    ?? semesters[0]

  const setTerm = useCallback((schoolYearId: string, semesterId: string) => {
    const next = { schoolYearId, semesterId }
    setPreferredTerm(next)
    sessionStorage.setItem(storageKey, JSON.stringify(next))
  }, [storageKey])

  const value = useMemo<AcademicTermContextValue>(() => ({
    schoolYears,
    semesters,
    schoolYearId: schoolYear?.id ?? "",
    semesterId: semester?.id ?? "",
    schoolYear,
    semester,
    label: schoolYear && semester
      ? `${schoolYear.schoolYear} · ${formatSemesterName(semester.name)}`
      : "Academic term unavailable",
    isLoading: schoolYearsQuery.isLoading || semestersQuery.isLoading,
    isError: schoolYearsQuery.isError || semestersQuery.isError,
    setTerm,
  }), [schoolYears, semesters, schoolYear, semester, schoolYearsQuery.isLoading, semestersQuery.isLoading, schoolYearsQuery.isError, semestersQuery.isError, setTerm])

  return <AcademicTermContext.Provider value={value}>{children}</AcademicTermContext.Provider>
}
