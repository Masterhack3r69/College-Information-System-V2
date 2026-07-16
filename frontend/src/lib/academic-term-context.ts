import { createContext, useContext } from "react"
import type { SchoolYear, Semester } from "@/lib/types"

export type AcademicTermContextValue = {
  schoolYears: SchoolYear[]
  semesters: Semester[]
  schoolYearId: string
  semesterId: string
  schoolYear?: SchoolYear
  semester?: Semester
  label: string
  isLoading: boolean
  isError: boolean
  setTerm: (schoolYearId: string, semesterId: string) => void
}

export const AcademicTermContext = createContext<AcademicTermContextValue | null>(null)

export function formatSemesterName(value?: string) {
  if (!value) return ""
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function useAcademicTerm() {
  const value = useContext(AcademicTermContext)
  if (!value) throw new Error("AcademicTermProvider missing")
  return value
}
