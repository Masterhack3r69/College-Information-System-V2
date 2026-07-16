import { CalendarDays } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSemesterName, useAcademicTerm } from "@/lib/academic-term-context"

const separator = "|"

export function AcademicTermSelector() {
  const term = useAcademicTerm()
  const value = term.schoolYearId && term.semesterId
    ? `${term.schoolYearId}${separator}${term.semesterId}`
    : undefined

  if (term.isLoading) {
    return <Skeleton className="h-10 w-[min(15.5rem,calc(100vw-8rem))] sm:w-72" />
  }

  return (
    <Select
      value={value}
      disabled={term.isError || !value}
      onValueChange={(nextValue) => {
        const [schoolYearId, semesterId] = nextValue.split(separator)
        if (schoolYearId && semesterId) term.setTerm(schoolYearId, semesterId)
      }}
    >
      <SelectTrigger
        aria-label="Academic term"
        data-testid="academic-term-selector"
        className="h-10 w-[min(15.5rem,calc(100vw-8rem))] border-0 px-2 shadow-none sm:w-72"
      >
        <CalendarDays />
        <span className="min-w-0 flex-1 text-left">
          <span className="hidden text-[11px] leading-none text-muted-foreground sm:block">Academic term</span>
          <span className="block truncate text-sm font-medium">{term.label}</span>
        </span>
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {term.schoolYears.map((schoolYear) => (
          <SelectGroup key={schoolYear.id}>
            <SelectLabel>
              {schoolYear.schoolYear}{schoolYear.active ? " · Active school year" : ""}
            </SelectLabel>
            {term.semesters.map((semester) => (
              <SelectItem
                key={`${schoolYear.id}-${semester.id}`}
                value={`${schoolYear.id}${separator}${semester.id}`}
              >
                {schoolYear.schoolYear} · {formatSemesterName(semester.name)}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
