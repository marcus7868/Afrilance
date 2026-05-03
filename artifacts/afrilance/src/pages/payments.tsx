import { useState } from "react";
import {
  useListPayments,
  useReleasePayment,
  useCreatePayment,
  useGetMyProfile,
  getListPaymentsQueryKey,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, formatRelative } from "@/lib/format";

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useGetMyProfile({ query: { queryKey: getGetMyProfileQueryKey() } });
  const { data, isLoading } = useListPayments({ query: { queryKey: getListPaymentsQueryKey() } });
  const { mutate: release } = useReleasePayment();
  const { mutate: create, isPending: creating } = useCreatePayment();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ jobId: "", freelancerId: "", amount: "" });
  const [createError, setCreateError] = useState("");

  const handleRelease = (id: number) => {
    release(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        },
      },
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobId || !form.freelancerId || !form.amount) {
      setCreateError("All fields are required");
      return;
    }
    setCreateError("");
    create(
      {
        data: {
          jobId: parseInt(form.jobId),
          freelancerId: parseInt(form.freelancerId),
          amount: parseFloat(form.amount),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          setShowCreate(false);
          setForm({ jobId: "", freelancerId: "", amount: "" });
        },
        onError: (err: any) => {
          setCreateError(err?.data?.error ?? "Failed to create payment");
        },
      },
    );
  };

  const totalEscrowed = data?.payments.filter((p) => p.status === "escrowed").reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const totalReleased = data?.payments.filter((p) => p.status === "released").reduce((sum, p) => sum + p.amount, 0) ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground text-sm">Mock escrow payment system</p>
        </div>
        {profile?.role === "client" && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Payment
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xl font-bold text-primary">{formatCurrency(totalEscrowed)}</div>
          <div className="text-sm text-muted-foreground">In Escrow</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xl font-bold text-foreground">{formatCurrency(totalReleased)}</div>
          <div className="text-sm text-muted-foreground">{profile?.role === "freelancer" ? "Total Earned" : "Total Released"}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !data?.payments.length ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <svg className="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-muted-foreground font-medium">No payments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.payments.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{p.jobTitle ?? `Job #${p.jobId}`}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {profile?.role === "freelancer"
                      ? `From ${p.clientName ?? "Client"}`
                      : `To ${p.freelancerName ?? "Freelancer"}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatRelative(p.createdAt)}
                    {p.releasedAt && ` · Released ${formatDate(p.releasedAt)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">{formatCurrency(p.amount)}</div>
                  <StatusBadge status={p.status} />
                  {p.status === "escrowed" && profile?.role === "client" && profile.id === p.clientId && (
                    <button
                      onClick={() => handleRelease(p.id)}
                      className="mt-2 block text-xs px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                    >
                      Release Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create payment modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Create Escrow Payment</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Job ID *</label>
                <input
                  type="number"
                  required
                  value={form.jobId}
                  onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                  placeholder="Enter job ID"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Freelancer Profile ID *</label>
                <input
                  type="number"
                  required
                  value={form.freelancerId}
                  onChange={(e) => setForm((f) => ({ ...f, freelancerId: e.target.value }))}
                  placeholder="Enter freelancer profile ID"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Amount (GHS) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₵</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="500"
                    className="w-full pl-7 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {creating ? "Creating..." : "Escrow Funds"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
