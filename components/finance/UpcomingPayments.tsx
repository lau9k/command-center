import { CalendarClock, Receipt } from "lucide-react";
import {
  formatCurrency,
  getDueColor,
  type Transaction,
  type ReimbursementRequest,
} from "./types";

interface UpcomingPayment extends Transaction {
  daysUntil: number;
}

interface PaymentGroup {
  label: string;
  items: UpcomingPayment[];
}

interface UpcomingPaymentsProps {
  paymentGroups: PaymentGroup[];
  outstandingReimbursements: ReimbursementRequest[];
  receivedReimbursements: ReimbursementRequest[];
  totalOutstanding: number;
  totalReceived: number;
}

export function UpcomingPaymentsSection({
  paymentGroups,
  outstandingReimbursements,
  receivedReimbursements,
  totalOutstanding,
  totalReceived,
}: UpcomingPaymentsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Upcoming Payments Section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Upcoming Payments
          </h3>
        </div>
        {paymentGroups.length > 0 ? (
          <div className="flex flex-col gap-4">
            {paymentGroups.map((group) => (
              <div key={group.label}>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h4>
                <div className="flex flex-col gap-1.5">
                  {group.items.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{
                            backgroundColor: getDueColor(p.daysUntil),
                          }}
                        />
                        <span className="text-foreground">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {p.daysUntil < 0
                            ? `${Math.abs(p.daysUntil)}d overdue`
                            : p.daysUntil === 0
                              ? "Due today"
                              : `in ${p.daysUntil}d`}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(Number(p.amount))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recurring payments with due dates
          </p>
        )}
      </div>

      {/* Invoicing Tracker */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Receipt className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Money Owed to Me
          </h3>
        </div>
        <div className="mb-4 rounded-md bg-muted/50 px-3 py-2 text-center">
          <span className="text-2xl font-bold text-foreground">
            {formatCurrency(totalOutstanding)}
          </span>
          <span className="ml-2 text-sm text-muted-foreground">
            outstanding
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Outstanding column */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Outstanding
            </h4>
            {outstandingReimbursements.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {outstandingReimbursements.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <div className="flex flex-col">
                      <span className="text-foreground">{r.title}</span>
                      <span className="text-[10px] capitalize text-muted-foreground">
                        {r.status}
                      </span>
                    </div>
                    <span className="font-medium text-[#EAB308]">
                      {formatCurrency(Number(r.total_amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                None
              </p>
            )}
          </div>
          {/* Received column */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Received
            </h4>
            {receivedReimbursements.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {receivedReimbursements.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span className="text-foreground">{r.title}</span>
                    <span className="font-medium text-[#22C55E]">
                      {formatCurrency(Number(r.total_amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                None yet
              </p>
            )}
            {totalReceived > 0 && (
              <div className="mt-2 border-t border-border pt-2 text-right text-xs text-muted-foreground">
                Total: {formatCurrency(totalReceived)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
