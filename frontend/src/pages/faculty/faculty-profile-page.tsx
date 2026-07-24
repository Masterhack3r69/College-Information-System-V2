import { useState } from "react"
import { Link } from "react-router-dom"
import { Save, ShieldCheck, UserRound } from "lucide-react"
import { toast } from "sonner"
import {
  useFacultyProfile,
  useUpdateFacultyProfile,
  type FacultyProfile,
} from "@/hooks/use-faculty-portal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function FacultyProfilePage() {
  const query = useFacultyProfile()
  return query.data ? (
    <ProfileForm
      key={`${query.data.email}-${query.data.contactNumber}`}
      profile={query.data}
    />
  ) : (
    <div className="p-8 text-muted-foreground">Loading faculty profile…</div>
  )
}
function ProfileForm({ profile }: { profile: FacultyProfile }) {
  const update = useUpdateFacultyProfile(),
    [email, setEmail] = useState(profile.email),
    [contact, setContact] = useState(profile.contactNumber ?? "")
  async function save() {
    await update.mutateAsync({ email, contactNumber: contact })
    toast.success("Profile updated")
  }
  return (
    <div className="mx-auto max-w-[960px] p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">Faculty profile</h1>
      <p className="mt-1 text-muted-foreground">
        Maintain your authoritative faculty contact information.
      </p>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_.72fr]">
        <section className="border bg-background p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserRound />
            Profile details
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Employee number</dt>
              <dd className="font-medium">{profile.employeeNumber}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Department</dt>
              <dd className="font-medium">{profile.department}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{profile.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Faculty type</dt>
              <dd className="font-medium">{profile.facultyType}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="faculty-email">Faculty email</Label>
              <Input
                id="faculty-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This email is synchronized to your account identity.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="faculty-contact">Contact number</Label>
              <Input
                id="faculty-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <Button onClick={() => void save()} disabled={!email}>
              <Save />
              Save profile
            </Button>
          </div>
        </section>
        <aside className="border bg-surface p-6">
          <div className="grid size-10 place-items-center rounded-md bg-info text-primary">
            <ShieldCheck />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Account security</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Password changes and signed-in devices are managed in the shared
            security center.
          </p>
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link to="/account/security">Open Account Security</Link>
          </Button>
        </aside>
      </div>
    </div>
  )
}
