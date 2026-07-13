import { ReceiptText, WalletCards } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
  return (
    <div className="mx-auto max-w-[1180px] p-5 md:p-8">
      <h1 className="flex items-center gap-3 text-3xl font-semibold text-[#092f66]">
        <WalletCards />
        Finance
      </h1>
      <p className="mt-2 text-slate-600">
        Tuition assessments, balances, payments, and official receipts.
      </p>
      <section className="mt-7 grid gap-4 rounded-lg border p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm text-slate-500">Total assessment</p>
          <p className="mt-2 text-2xl font-semibold">
            {money(current?.totalAssessment ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Amount paid</p>
          <p className="mt-2 text-2xl font-semibold text-[#0f7d82]">
            {money(current?.amountPaid ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Balance</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">
            {money(current?.balance ?? 0)}
          </p>
        </div>
      </section>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
