import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, FileText, GraduationCap, Save } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
type Setting = {
  id: string
  schoolYear: string
  semesterName: string
  enrollment_enabled: boolean
  attendance_visible: boolean
  portal_notice?: string
}
type Notice = {
  id: string
  title: string
  body: string
  audience: string
  status: string
}
type Form = { id: string; title: string; filename: string; status: string }
type Request = {
  id: string
  studentNumber: string
  studentName: string
  requestType: string
  documentName?: string
  purpose: string
  status: string
  staffComment?: string
}

function SettingEditor({
  setting,
  onSave,
}: {
  setting: Setting
  onSave: (value: Setting) => Promise<unknown>
}) {
  const [enrollmentEnabled, setEnrollmentEnabled] = useState(
    setting.enrollment_enabled
  )
  const [attendanceVisible, setAttendanceVisible] = useState(
    setting.attendance_visible
  )
  const [notice, setNotice] = useState(setting.portal_notice ?? "")
  return (
    <section className="rounded-lg border p-5">
      <h2 className="font-semibold">
        {setting.schoolYear} · {setting.semesterName.replaceAll("_", " ")}
      </h2>
      <FieldGroup className="mt-4">
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={enrollmentEnabled}
              onCheckedChange={(v) => setEnrollmentEnabled(v === true)}
            />
            Online enrollment enabled
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={attendanceVisible}
              onCheckedChange={(v) => setAttendanceVisible(v === true)}
            />
            Attendance visible
          </label>
        </div>
        <Field>
          <FieldLabel>Portal notice</FieldLabel>
          <Textarea
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
          />
        </Field>
        <Button
          className="self-start"
          size="sm"
          onClick={() =>
            void onSave({
              ...setting,
              enrollment_enabled: enrollmentEnabled,
              attendance_visible: attendanceVisible,
              portal_notice: notice,
            })
          }
        >
          <Save data-icon="inline-start" />
          Save
        </Button>
      </FieldGroup>
    </section>
  )
}
export function StudentPortalAdminPage() {
  const c = useQueryClient(),
    settings = useQuery({
      queryKey: ["student-admin-settings"],
      queryFn: () => api<Setting[]>("/student-portal-admin/settings"),
    }),
    notices = useQuery({
      queryKey: ["student-admin-notices"],
      queryFn: () => api<Notice[]>("/student-portal-admin/announcements"),
    }),
    forms = useQuery({
      queryKey: ["student-admin-forms"],
      queryFn: () => api<Form[]>("/student-portal-admin/forms"),
    }),
    requests = useQuery({
      queryKey: ["student-admin-requests"],
      queryFn: () => api<Request[]>("/student-portal-admin/requests"),
    })
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [formTitle, setFormTitle] = useState(""),
    [file, setFile] = useState<File>(),
    [fulfillmentFiles, setFulfillmentFiles] = useState<
      Record<string, File | undefined>
    >({})
  const saveSettings = useMutation({
    mutationFn: (v: Setting) =>
      api(`/student-portal-admin/settings/${v.id}`, {
        method: "PUT",
        body: JSON.stringify({
          enrollmentEnabled: v.enrollment_enabled,
          attendanceVisible: v.attendance_visible,
          portalNotice: v.portal_notice,
        }),
      }),
    onSuccess: () => toast.success("Portal settings saved"),
  })
  async function publish() {
    await api("/student-portal-admin/announcements", {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        audience: "ALL",
        status: "PUBLISHED",
      }),
    })
    setTitle("")
    setBody("")
    await notices.refetch()
    toast.success("Academic notice published")
  }
  async function upload() {
    if (!file) return
    const data = new FormData()
    data.set("title", formTitle)
    data.set("status", "PUBLISHED")
    data.set("file", file)
    await api("/student-portal-admin/forms", { method: "POST", body: data })
    setFormTitle("")
    setFile(undefined)
    await forms.refetch()
    toast.success("Student form published")
  }
  async function transition(id: string, status: string) {
    await api(`/student-portal-admin/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
    await c.invalidateQueries({ queryKey: ["student-admin-requests"] })
    toast.success("Request updated")
  }
  async function fulfill(id: string) {
    const fulfillment = fulfillmentFiles[id]
    if (!fulfillment) return
    const data = new FormData()
    data.set("file", fulfillment)
    await api(`/student-portal-admin/requests/${id}/fulfillment`, {
      method: "POST",
      body: data,
    })
    setFulfillmentFiles((current) => ({ ...current, [id]: undefined }))
    await c.invalidateQueries({ queryKey: ["student-admin-requests"] })
    toast.success("Fulfilled document is ready for the student")
  }
  return (
    <div className="p-5 md:p-8">
      <h1 className="flex items-center gap-3 text-3xl font-semibold">
        <GraduationCap />
        Student Portal Administration
      </h1>
      <p className="mt-2 text-muted-foreground">
        Enrollment windows, academic notices, forms, and student service
        requests.
      </p>
      <Tabs defaultValue="settings" className="mt-7">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <div className="mt-5 flex flex-col gap-4">
            {settings.data?.map((x) => (
              <SettingEditor
                key={x.id}
                setting={x}
                onSave={saveSettings.mutateAsync}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="notices">
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Bell />
                Publish notice
              </h2>
              <FieldGroup className="mt-4">
                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Message</FieldLabel>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </Field>
                <Button
                  onClick={() => void publish()}
                  disabled={!title || !body}
                >
                  Publish
                </Button>
              </FieldGroup>
            </section>
            <section className="overflow-hidden rounded-lg border">
              <div className="divide-y">
                {notices.data?.map((x) => (
                  <article key={x.id} className="p-4">
                    <p className="font-medium">{x.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {x.status} · {x.audience}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="forms">
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <FileText />
                Publish form
              </h2>
              <FieldGroup className="mt-4">
                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>File</FieldLabel>
                  <Input
                    type="file"
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={(e) => setFile(e.target.files?.[0])}
                  />
                </Field>
                <Button
                  onClick={() => void upload()}
                  disabled={!formTitle || !file}
                >
                  Upload
                </Button>
              </FieldGroup>
            </section>
            <section className="overflow-hidden rounded-lg border">
              <div className="divide-y">
                {forms.data?.map((x) => (
                  <article key={x.id} className="p-4">
                    <p className="font-medium">{x.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {x.filename} · {x.status}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="requests">
          <div className="mt-5 divide-y overflow-hidden rounded-lg border">
            {requests.data?.map((x) => (
              <article
                key={x.id}
                className="grid gap-4 p-5 lg:grid-cols-[1fr_210px]"
              >
                <div>
                  <p className="font-semibold">
                    {x.studentName} · {x.studentNumber}
                  </p>
                  <p className="text-sm">{x.documentName ?? x.requestType}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {x.purpose}
                  </p>
                </div>
                <div className="space-y-2">
                  <Select
                    value={x.status}
                    onValueChange={(v) => void transition(x.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="READY">Ready</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {x.requestType === "DOCUMENT" &&
                  ["SUBMITTED", "PROCESSING"].includes(x.status) ? (
                    <div className="space-y-2 rounded-md border p-2">
                      <Input
                        type="file"
                        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                        onChange={(e) =>
                          setFulfillmentFiles((current) => ({
                            ...current,
                            [x.id]: e.target.files?.[0],
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!fulfillmentFiles[x.id]}
                        onClick={() => void fulfill(x.id)}
                      >
                        Upload fulfilled file
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
