import { Bell, Download, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadFile } from "@/lib/api"
import {
  useStudentAnnouncements,
  useStudentMaterials,
} from "@/hooks/use-student-portal"
export default function StudentAnnouncementsPage() {
  const notices = useStudentAnnouncements(),
    materials = useStudentMaterials()
  return (
    <div className="mx-auto max-w-[1180px] p-5 md:p-8">
      <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]">
        <Bell />
        Announcements
      </h1>
      <p className="mt-2 text-slate-600">
        Academic notices and published content from your classes.
      </p>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="overflow-hidden rounded-lg border">
          <header className="border-b px-5 py-4 font-semibold">
            Latest notices
          </header>
          <div className="divide-y">
            {notices.data?.map((x) => (
              <article key={x.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{x.title}</h2>
                  <span className="text-xs text-slate-500">{x.source}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {x.body}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(x.publishedAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="overflow-hidden rounded-lg border">
          <header className="flex items-center gap-3 border-b px-5 py-4 font-semibold">
            <Folder />
            Learning materials
          </header>
          <div className="divide-y">
            {materials.data?.map((x) => (
              <article key={x.id} className="p-4">
                <p className="font-medium">{x.title}</p>
                <p className="text-xs text-slate-500">
                  {x.courseCode} · {x.filename}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    void downloadFile(`/student/me/materials/${x.id}/download`)
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
    </div>
  )
}
