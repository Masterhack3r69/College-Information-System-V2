import { useState } from "react"
import { Download, FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { downloadFile } from "@/lib/api"
import {
  useCancelStudentRequest,
  useCreateStudentRequest,
  useStudentForms,
  useStudentRequests,
} from "@/hooks/use-student-portal"
import { toast } from "sonner"
export default function StudentDocumentsPage() {
  const forms = useStudentForms(),
    requests = useStudentRequests(),
    create = useCreateStudentRequest(),
    cancel = useCancelStudentRequest()
  const [type, setType] = useState("DOCUMENT"),
    [name, setName] = useState(""),
    [purpose, setPurpose] = useState("")
  async function submit() {
    await create.mutateAsync({ requestType: type, documentName: name, purpose })
    setName("")
    setPurpose("")
    toast.success("Request submitted")
  }
  return (
    <div className="mx-auto max-w-[1180px] p-5 md:p-8">
      <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]">
        <FileText />
        Documents
      </h1>
      <p className="mt-2 text-slate-600">
        Download student forms and track document or clearance requests.
      </p>
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border p-5">
          <h2 className="font-semibold">New request</h2>
          <FieldGroup className="mt-5">
            <Field>
              <FieldLabel>Request type</FieldLabel>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="DOCUMENT">Document</SelectItem>
                    <SelectItem value="CLEARANCE">Clearance</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Document or clearance name</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Certificate of Enrollment"
              />
            </Field>
            <Field>
              <FieldLabel>Purpose</FieldLabel>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Tell the registrar what this is for"
              />
            </Field>
            <Button
              onClick={() => void submit()}
              disabled={!name || !purpose || create.isPending}
            >
              <Plus data-icon="inline-start" />
              Submit request
            </Button>
          </FieldGroup>
        </section>
        <section className="overflow-hidden rounded-lg border">
          <header className="border-b px-5 py-4 font-semibold">
            Downloadable forms
          </header>
          <div className="divide-y">
            {forms.data?.map((x) => (
              <article
                key={x.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium">{x.title}</p>
                  <p className="text-xs text-slate-500">
                    {x.description ?? x.filename}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void downloadFile(`/student/me/forms/${x.id}/download`)
                  }
                >
                  <Download data-icon="inline-start" />
                  Download
                </Button>
              </article>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-6 overflow-hidden rounded-lg border">
        <header className="border-b px-5 py-4 font-semibold">
          Request status
        </header>
        <div className="divide-y">
          {requests.data?.map((x) => (
            <article
              key={x.id}
              className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium">
                    {x.documentName ?? x.requestType}
                  </p>
                  <Badge variant="outline">{x.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{x.purpose}</p>
                {x.staffComment ? (
                  <p className="mt-2 text-sm">Registrar: {x.staffComment}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                {x.downloadReady ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void downloadFile(`/student/me/requests/${x.id}/download`)
                    }
                  >
                    <Download data-icon="inline-start" />
                    Download
                  </Button>
                ) : null}
                {x.status === "SUBMITTED" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void cancel.mutateAsync(x.id)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
