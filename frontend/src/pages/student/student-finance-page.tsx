import { Download, ReceiptText, WalletCards } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { openPdf } from "@/lib/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useStudentFinance,
  useStudentPayments,
} from "@/hooks/use-student-portal"
const money = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    n
  )
export default function StudentFinancePage() {
  const assessments = useStudentFinance(),
    payments = useStudentPayments()
  const current = assessments.data?.[0]
  const list = <T,>(value: unknown): T[] => { if (Array.isArray(value)) return value as T[]; if (typeof value === "string") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] } } return [] }
  return (
    <div className="mx-auto max-w-[1180px] p-4 sm:p-6 lg:p-8">
      <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
        <WalletCards />
        Finance
      </h1>
      <p className="mt-2 text-muted-foreground">
        Tuition assessments, balances, payments, and official receipts.
      </p>
      <section className="mt-7 grid gap-4 rounded-lg border p-6 sm:grid-cols-5">
        <div>
          <p className="text-sm text-muted-foreground">Total assessment</p>
          <p className="mt-2 text-2xl font-semibold">
            {money(current?.totalAssessment ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Gross paid</p>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {money(current?.amountPaid ?? 0)}
          </p>
        </div>
        <div><p className="text-sm text-muted-foreground">Refunded</p><p className="mt-2 text-2xl font-semibold">{money(current?.refundedAmount ?? 0)}</p></div>
        <div><p className="text-sm text-muted-foreground">Net paid</p><p className="mt-2 text-2xl font-semibold text-primary">{money(current?.netPaidAmount ?? 0)}</p></div>
        <div>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="mt-2 text-2xl font-semibold text-warning-foreground">
            {money(current?.balance ?? 0)}
          </p>
        </div>
      </section>
      <section className="mt-6 space-y-4"><h2 className="text-lg font-semibold text-foreground">All term assessments</h2>{assessments.data?.map(assessment => {
        const items = list<{description:string; totalAmount:number}>(assessment.items), installments = list<{id:string;label:string;dueDate:string;amount:number;allocatedAmount:number;status:string}>(assessment.installments), adjustments = list<{id:string;type:string;signedEffect:number;reason:string}>(assessment.adjustments)
        return <article key={assessment.id} className="rounded-lg border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{assessment.schoolYear} · {assessment.semesterName.replaceAll("_", " ")}</h3><p className="text-sm text-muted-foreground">Base {money(assessment.baseAssessmentAmount)} · Adjustments {money(assessment.adjustmentAmount)}</p></div><Badge variant="outline">{assessment.status.replaceAll("_", " ")}</Badge></div><div className="mt-4 grid gap-5 lg:grid-cols-3"><div><h4 className="mb-2 text-sm font-semibold">Itemization</h4>{items.length ? items.map(item => <div key={item.description} className="flex justify-between border-b py-1 text-sm"><span>{item.description}</span><span>{money(item.totalAmount)}</span></div>) : <p className="text-sm text-muted-foreground">No item details.</p>}</div><div><h4 className="mb-2 text-sm font-semibold">Installments</h4>{installments.length ? installments.map(line => <div key={line.id} className="border-b py-1 text-sm"><div className="flex justify-between"><span>{line.label}</span><Badge variant="outline">{line.status}</Badge></div><p className="text-xs text-muted-foreground">Due {line.dueDate} · {money(line.allocatedAmount)} of {money(line.amount)}</p></div>) : <p className="text-sm text-muted-foreground">No installment plan assigned.</p>}</div><div><h4 className="mb-2 text-sm font-semibold">Approved adjustments</h4>{adjustments.length ? adjustments.map(item => <div key={item.id} className="border-b py-1 text-sm"><div className="flex justify-between"><span>{item.type.replaceAll("_", " ")}</span><span>{money(item.signedEffect)}</span></div><p className="text-xs text-muted-foreground">{item.reason}</p></div>) : <p className="text-sm text-muted-foreground">No adjustments.</p>} {assessment.creditBalance > 0 ? <p className="mt-3 font-semibold text-success-foreground">Credit balance: {money(assessment.creditBalance)}</p> : null}</div></div></article>})}</section>
      <section className="mt-6 overflow-hidden rounded-lg border">
        <header className="flex h-14 items-center gap-3 border-b px-5 font-semibold">
          <ReceiptText />
          Payment & Receipt History
        </header>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.data?.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="font-medium">{x.receiptNumber}</TableCell>
                <TableCell>{new Date(x.paidAt).toLocaleDateString()}</TableCell>
                <TableCell>{x.paymentMethod.replaceAll("_", " ")}</TableCell>
                <TableCell>{money(x.amount)}</TableCell>
                <TableCell>
                  <Badge
                    variant={x.status === "POSTED" ? "secondary" : "outline"}
                  >
                    {x.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => void openPdf(`/student/me/payments/${x.id}/receipt`)}><Download/> View PDF</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
