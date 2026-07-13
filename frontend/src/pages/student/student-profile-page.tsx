import { useState } from "react"
import { Save, ShieldCheck, UserRound } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  type StudentProfile,
  useStudentProfile,
  useUpdateStudentProfile,
} from "@/hooks/use-student-portal"
import { toast } from "sonner"
export default function StudentProfilePage() {
  const q = useStudentProfile()
  return q.data ? (
    <StudentProfileForm profile={q.data} />
  ) : (
    <div className="p-8 text-sm text-muted-foreground">Loading profile…</div>
  )
}
function StudentProfileForm({ profile }: { profile: StudentProfile }) {
  const save = useUpdateStudentProfile(),
    [form, setForm] = useState({
      email: profile.email ?? "",
      mobileNumber: profile.mobileNumber ?? "",
      telephoneNumber: profile.telephoneNumber ?? "",
      currentAddress: profile.currentAddress ?? "",
      emergencyContactName: profile.emergencyContactName ?? "",
      emergencyContactNumber: profile.emergencyContactNumber ?? "",
      emergencyContactRelationship: profile.emergencyContactRelationship ?? "",
      emergencyContactAddress: profile.emergencyContactAddress ?? "",
    })
  async function submit() {
    await save.mutateAsync(form)
    toast.success("Profile updated")
  }
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  return (
    <div className="mx-auto max-w-[1000px] p-5 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]">
            <UserRound />
            Profile & Security
          </h1>
          <p className="mt-2 text-slate-600">
            Official identity fields are read-only. You may maintain contact
            information.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/student/account/password">
            <ShieldCheck data-icon="inline-start" />
            Change password
          </Link>
        </Button>
      </div>
      <section className="mt-7 rounded-lg border p-6">
        <h2 className="font-semibold">Academic identity</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Student number", profile.studentNumber],
            ["Name", profile.fullName],
            ["Program", profile.programCode],
            ["Curriculum", profile.curriculumCode],
            ["Year level", profile.yearLevel],
            ["Academic status", profile.academicStatus],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="mt-1 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">Contact information</h2>
        <FieldGroup className="mt-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel>Account email</FieldLabel>
              <Input type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field>
              <FieldLabel>Mobile number</FieldLabel>
              <Input value={form.mobileNumber} onChange={set("mobileNumber")} />
            </Field>
            <Field>
              <FieldLabel>Telephone</FieldLabel>
              <Input
                value={form.telephoneNumber}
                onChange={set("telephoneNumber")}
              />
            </Field>
            <Field>
              <FieldLabel>Emergency contact</FieldLabel>
              <Input
                value={form.emergencyContactName}
                onChange={set("emergencyContactName")}
              />
            </Field>
            <Field>
              <FieldLabel>Emergency contact number</FieldLabel>
              <Input
                value={form.emergencyContactNumber}
                onChange={set("emergencyContactNumber")}
              />
            </Field>
            <Field>
              <FieldLabel>Relationship</FieldLabel>
              <Input
                value={form.emergencyContactRelationship}
                onChange={set("emergencyContactRelationship")}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Current address</FieldLabel>
            <Textarea
              value={form.currentAddress}
              onChange={set("currentAddress")}
            />
          </Field>
          <Field>
            <FieldLabel>Emergency contact address</FieldLabel>
            <Textarea
              value={form.emergencyContactAddress}
              onChange={set("emergencyContactAddress")}
            />
          </Field>
          <Button
            className="self-start"
            onClick={() => void submit()}
            disabled={!form.email || save.isPending}
          >
            <Save data-icon="inline-start" />
            Save changes
          </Button>
        </FieldGroup>
      </section>
    </div>
  )
}
