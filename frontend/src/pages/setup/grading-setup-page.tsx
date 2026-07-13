import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import type {
  ActiveStatus,
  GradingCategory,
  GradingScale,
  GradingScaleBand,
  GradingTemplate,
} from "@/lib/types"
import {
  useGradingScales,
  useGradingTemplates,
  useSaveGradingScale,
  useSaveGradingTemplate,
} from "@/hooks/use-grades"
import { useCourses, usePrograms } from "@/hooks/use-setup"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
const pretty = (v: string) => v.replaceAll("_", " ")
const message = (e: unknown) =>
  e instanceof ApiError ? e.message : "Unable to save grading setup"
const defaultBands = ([
  {
    minimumPercentage: 96,
    maximumPercentage: 100,
    gradePoint: 1,
    remark: "PASSED",
  },
  {
    minimumPercentage: 94,
    maximumPercentage: 95.99,
    gradePoint: 1.25,
    remark: "PASSED",
  },
  {
    minimumPercentage: 92,
    maximumPercentage: 93.99,
    gradePoint: 1.5,
    remark: "PASSED",
  },
  {
    minimumPercentage: 89,
    maximumPercentage: 91.99,
    gradePoint: 1.75,
    remark: "PASSED",
  },
  {
    minimumPercentage: 86,
    maximumPercentage: 88.99,
    gradePoint: 2,
    remark: "PASSED",
  },
  {
    minimumPercentage: 83,
    maximumPercentage: 85.99,
    gradePoint: 2.25,
    remark: "PASSED",
  },
  {
    minimumPercentage: 80,
    maximumPercentage: 82.99,
    gradePoint: 2.5,
    remark: "PASSED",
  },
  {
    minimumPercentage: 77,
    maximumPercentage: 79.99,
    gradePoint: 2.75,
    remark: "PASSED",
  },
  {
    minimumPercentage: 75,
    maximumPercentage: 76.99,
    gradePoint: 3,
    remark: "PASSED",
  },
  {
    minimumPercentage: 0,
    maximumPercentage: 74.99,
    gradePoint: 5,
    remark: "FAILED",
  },
] satisfies GradingScaleBand[]).sort(
  (a, b) => a.minimumPercentage - b.minimumPercentage
)
export function GradingSetupPage() {
  return (
    <Tabs defaultValue="templates" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="templates">Grading Templates</TabsTrigger>
        <TabsTrigger value="scales">Grade Scales</TabsTrigger>
      </TabsList>
      <TabsContent value="templates">
        <Templates />
      </TabsContent>
      <TabsContent value="scales">
        <Scales />
      </TabsContent>
    </Tabs>
  )
}
function Scales() {
  const q = useGradingScales(),
    save = useSaveGradingScale()
  const [editing, setEditing] = useState<GradingScale | "new">()
  const [form, setForm] = useState({
    scaleCode: "",
    scaleName: "",
    version: 1,
    status: "ACTIVE" as ActiveStatus,
    bands: defaultBands,
  })
  useEffect(() => {
    if (editing === "new")
      setForm({
        scaleCode: "",
        scaleName: "",
        version: 1,
        status: "ACTIVE",
        bands: defaultBands,
      })
    else if (editing)
      setForm({
        scaleCode: editing.scaleCode,
        scaleName: editing.scaleName,
        version: editing.version,
        status: editing.status,
        bands: editing.bands,
      })
  }, [editing])
  async function submit() {
    try {
      await save.mutateAsync({
        ...(editing !== "new" && editing ? { id: editing.id } : {}),
        ...form,
      })
      toast.success("Grading scale saved")
      setEditing(undefined)
    } catch (e) {
      toast.error(message(e))
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <Header
        title="Grade Scales"
        description="Map final percentages to official grade points."
        action={() => setEditing("new")}
        label="New scale"
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Bands</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.scaleCode}</TableCell>
                <TableCell>{s.scaleName}</TableCell>
                <TableCell>{s.version}</TableCell>
                <TableCell>{s.bands.length}</TableCell>
                <TableCell>
                  <Badge>{s.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" onClick={() => setEditing(s)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(undefined)
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "New grade scale" : "Edit grade scale"}
            </DialogTitle>
            <DialogDescription>
              Bands must cover 0–100 without gaps or overlaps.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            <Field
              label="Code"
              value={form.scaleCode}
              set={(v) => setForm((f) => ({ ...f, scaleCode: v }))}
            />
            <Field
              label="Name"
              value={form.scaleName}
              set={(v) => setForm((f) => ({ ...f, scaleName: v }))}
            />
            <Field
              label="Version"
              type="number"
              value={String(form.version)}
              set={(v) => setForm((f) => ({ ...f, version: Number(v) }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            {form.bands.map((b, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2"
              >
                <Field
                  label={i === 0 ? "Minimum" : ""}
                  type="number"
                  value={String(b.minimumPercentage)}
                  set={(v) =>
                    setForm((f) => ({
                      ...f,
                      bands: f.bands.map((x, j) =>
                        j === i ? { ...x, minimumPercentage: Number(v) } : x
                      ),
                    }))
                  }
                />
                <Field
                  label={i === 0 ? "Maximum" : ""}
                  type="number"
                  value={String(b.maximumPercentage)}
                  set={(v) =>
                    setForm((f) => ({
                      ...f,
                      bands: f.bands.map((x, j) =>
                        j === i ? { ...x, maximumPercentage: Number(v) } : x
                      ),
                    }))
                  }
                />
                <Field
                  label={i === 0 ? "Grade point" : ""}
                  type="number"
                  value={String(b.gradePoint)}
                  set={(v) =>
                    setForm((f) => ({
                      ...f,
                      bands: f.bands.map((x, j) =>
                        j === i ? { ...x, gradePoint: Number(v) } : x
                      ),
                    }))
                  }
                />
                <div className="flex flex-col gap-2">
                  {i === 0 ? <Label>Remark</Label> : null}
                  <Select
                    value={b.remark}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        bands: f.bands.map((x, j) =>
                          j === i
                            ? { ...x, remark: v as "PASSED" | "FAILED" }
                            : x
                        ),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="PASSED">Passed</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="self-end"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      bands: f.bands.filter((_, j) => j !== i),
                    }))
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() =>
              setForm((f) => ({
                ...f,
                bands: [
                  ...f.bands,
                  {
                    minimumPercentage: 0,
                    maximumPercentage: 0,
                    gradePoint: 5,
                    remark: "FAILED",
                  },
                ],
              }))
            }
          >
            <Plus /> Add band
          </Button>
          <DialogFooter>
            <Button
              onClick={() => void submit()}
              disabled={!form.scaleCode || !form.scaleName}
            >
              Save scale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
function Templates() {
  const q = useGradingTemplates(),
    scales = useGradingScales().data ?? [],
    programs = usePrograms("", 0, 200).data?.items ?? [],
    courses = useCourses("", 0, 500).data?.items ?? [],
    save = useSaveGradingTemplate()
  const [editing, setEditing] = useState<GradingTemplate | "new">()
  const baseCategories: GradingCategory[] = [
    { period: "MIDTERM", categoryName: "Coursework", weight: 60, sortOrder: 0 },
    {
      period: "MIDTERM",
      categoryName: "Examination",
      weight: 40,
      sortOrder: 1,
    },
    { period: "FINAL", categoryName: "Coursework", weight: 60, sortOrder: 0 },
    { period: "FINAL", categoryName: "Examination", weight: 40, sortOrder: 1 },
  ]
  const [form, setForm] = useState({
    templateCode: "",
    templateName: "",
    programId: "",
    courseId: "",
    scaleId: "",
    version: 1,
    midtermWeight: 50,
    finalWeight: 50,
    status: "ACTIVE" as ActiveStatus,
    categories: baseCategories,
  })
  useEffect(() => {
    if (editing === "new")
      setForm({
        templateCode: "",
        templateName: "",
        programId: "",
        courseId: "",
        scaleId: scales[0]?.id ?? "",
        version: 1,
        midtermWeight: 50,
        finalWeight: 50,
        status: "ACTIVE",
        categories: baseCategories,
      })
    else if (editing)
      setForm({
        templateCode: editing.templateCode,
        templateName: editing.templateName,
        programId: editing.programId,
        courseId: editing.courseId,
        scaleId: editing.scaleId,
        version: editing.version,
        midtermWeight: editing.midtermWeight,
        finalWeight: editing.finalWeight,
        status: editing.status,
        categories: editing.categories,
      })
  }, [editing, scales])
  const totals = {
    MIDTERM: form.categories
      .filter((c) => c.period === "MIDTERM")
      .reduce((a, c) => a + c.weight, 0),
    FINAL: form.categories
      .filter((c) => c.period === "FINAL")
      .reduce((a, c) => a + c.weight, 0),
  }
  async function submit() {
    try {
      await save.mutateAsync({
        ...(editing !== "new" && editing ? { id: editing.id } : {}),
        ...form,
      })
      toast.success("Grading template saved")
      setEditing(undefined)
    } catch (e) {
      toast.error(message(e))
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <Header
        title="Grading Templates"
        description="Define reusable weighted categories for a program and course."
        action={() => setEditing("new")}
        label="New template"
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Scale</TableHead>
              <TableHead>Weights</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <p className="font-medium">{t.templateName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.templateCode} · v{t.version}
                  </p>
                </TableCell>
                <TableCell>{t.programCode}</TableCell>
                <TableCell>{t.courseCode}</TableCell>
                <TableCell>{t.scaleName}</TableCell>
                <TableCell>
                  {t.midtermWeight}% / {t.finalWeight}%
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" onClick={() => setEditing(t)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(undefined)
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {editing === "new"
                ? "New grading template"
                : "Edit grading template"}
            </DialogTitle>
            <DialogDescription>
              Period weights and each period’s category weights must total 100%.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-4">
            <Field
              label="Code"
              value={form.templateCode}
              set={(v) => setForm((f) => ({ ...f, templateCode: v }))}
            />
            <Field
              label="Name"
              value={form.templateName}
              set={(v) => setForm((f) => ({ ...f, templateName: v }))}
            />
            <Choice
              label="Program"
              value={form.programId}
              set={(v) => setForm((f) => ({ ...f, programId: v }))}
              values={programs.map((x) => ({ v: x.id, l: x.programCode }))}
            />
            <Choice
              label="Course"
              value={form.courseId}
              set={(v) => setForm((f) => ({ ...f, courseId: v }))}
              values={courses.map((x) => ({ v: x.id, l: x.courseCode }))}
            />
            <Choice
              label="Scale"
              value={form.scaleId}
              set={(v) => setForm((f) => ({ ...f, scaleId: v }))}
              values={scales.map((x) => ({ v: x.id, l: x.scaleName }))}
            />
            <Field
              label="Version"
              type="number"
              value={String(form.version)}
              set={(v) => setForm((f) => ({ ...f, version: Number(v) }))}
            />
            <Field
              label="Midterm %"
              type="number"
              value={String(form.midtermWeight)}
              set={(v) => setForm((f) => ({ ...f, midtermWeight: Number(v) }))}
            />
            <Field
              label="Final %"
              type="number"
              value={String(form.finalWeight)}
              set={(v) => setForm((f) => ({ ...f, finalWeight: Number(v) }))}
            />
          </div>
          <Alert>
            <AlertDescription>
              Category totals — Midterm: <strong>{totals.MIDTERM}%</strong> ·
              Final: <strong>{totals.FINAL}%</strong>
            </AlertDescription>
          </Alert>
          {(["MIDTERM", "FINAL"] as const).map((period) => (
            <div key={period} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{pretty(period)}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      categories: [
                        ...f.categories,
                        {
                          period,
                          categoryName: "",
                          weight: 0,
                          sortOrder: f.categories.filter(
                            (c) => c.period === period
                          ).length,
                        },
                      ],
                    }))
                  }
                >
                  <Plus /> Add category
                </Button>
              </div>
              {form.categories.map((c, i) =>
                c.period === period ? (
                  <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2">
                    <Input
                      placeholder="Category name"
                      value={c.categoryName}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          categories: f.categories.map((x, j) =>
                            j === i ? { ...x, categoryName: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <Input
                      type="number"
                      value={c.weight}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          categories: f.categories.map((x, j) =>
                            j === i
                              ? { ...x, weight: Number(e.target.value) }
                              : x
                          ),
                        }))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          categories: f.categories.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null
              )}
            </div>
          ))}
          <DialogFooter>
            <Button
              disabled={
                !form.templateCode ||
                !form.templateName ||
                !form.programId ||
                !form.courseId ||
                !form.scaleId ||
                totals.MIDTERM !== 100 ||
                totals.FINAL !== 100 ||
                form.midtermWeight + form.finalWeight !== 100
              }
              onClick={() => void submit()}
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
function Header({
  title,
  description,
  action,
  label,
}: {
  title: string
  description: string
  action: () => void
  label: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button onClick={action}>
        <Plus /> {label}
      </Button>
    </div>
  )
}
function Field({
  label,
  value,
  set,
  type = "text",
}: {
  label: string
  value: string
  set: (v: string) => void
  type?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <Label>{label}</Label> : null}
      <Input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  )
}
function Choice({
  label,
  value,
  set,
  values,
}: {
  label: string
  value: string
  set: (v: string) => void
  values: { v: string; l: string }[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={set}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {values.map((x) => (
              <SelectItem key={x.v} value={x.v}>
                {x.l}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
