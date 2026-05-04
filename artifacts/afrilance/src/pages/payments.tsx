import { useState, useEffect, useCallback } from "react";
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
import { useUser } from "@clerk/react";

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

function usePaystackPublicKey() {
  const [key, setKey] = useState("");
  useEffect(() => {
    fetch("/api/config/public")
      .then((r) => r.json())
      .then((d) => setKey(d.paystackPublicKey ?? ""))
      .catch(() => {});
  }, []);
  return key;
}

function usePaystackScript() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.PaystackPop) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const paystackPublicKey = usePaystackPublicKey();
  const paystackReady = usePaystackScript();

  const { data: profile } = useGetMyProfile({ query: { queryKey: getGetMyProfileQueryKey() } });
  const { data, isLoading } = useListPayments({ query: { queryKey: getListPaymentsQueryKey() } });
  const { mutate: create, isPending: creating } = useCreatePayment();
  const { mutate: release, isPending: releasing } = useReleasePayment();

  const [showCreate, setShowCreate] = useState(false);
  const [showRelease, setShowRelease] = useState<number | null>(null);
  const [form, setForm] = useState({ jobId: "", freelancerId: "", amount: "" });
  const [releaseForm, setReleaseForm] = useState({ accountNumber: "", bankCode: "", accountName: "" });
  const [createError, setCreateError] = useState("");
  const [releaseError, setReleaseError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  const openPaystackCheckout = useCallback(
    (authorizationUrl: string, reference: string, _paymentId: number) => {
      window.open(authorizationUrl, "_blank");
      setVerifyMsg(`Payment window opened. Once you complete payment, click "Verify Payment" below.`);
      sessionStorage.setItem("pending_paystack_ref", reference);
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      setShowCreate(false);
    },
    [queryClient],
  );

  const handleVerifyPending = async () => {
    const ref = sessionStorage.getItem("pending_paystack_ref");
    if (!ref) { setVerifyMsg("No pending payment reference found."); return; }
    setVerifying(true);
    setVerifyMsg("");
    try {
      const res = await fetch(`/api/payments/verify/${ref}`);
      const data = await res.json();
      if (!res.ok) { setVerifyMsg(data.error ?? "Verification failed"); }
      else {
        sessionStorage.removeItem("pending_paystack_ref");
        setVerifyMsg("Payment verified and held in escrow!");
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      }
    } catch {
      setVerifyMsg("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobId || !form.freelancerId || !form.amount) {
      setCreateError("All fields are required");
      return;
    }
    if (!paystackReady || !paystackPublicKey) {
      setCreateError("Payment system not ready. Please refresh and try again.");
      return;
    }
    const clientEmail = user?.primaryEmailAddress?.emailAddress ?? "";
    if (!clientEmail) {
      setCreateError("No email found on your account. Please update your Clerk profile.");
      return;
    }
    setCreateError("");

    create(
      {
        data: {
          jobId: parseInt(form.jobId),
          freelancerId: parseInt(form.freelancerId),
          amount: parseFloat(form.amount),
          clientEmail,
        },
      },
      {
        onSuccess: (resp) => {
          setForm({ jobId: "", freelancerId: "", amount: "" });
          openPaystackCheckout(resp.authorizationUrl, resp.reference, resp.paymentId);
        },
        onError: (err: any) => {
          setCreateError(err?.response?.data?.error ?? "Failed to initialize payment");
        },
      },
    );
  };

  const handleRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRelease) return;
    setReleaseError("");

    const body: Record<string, string> = {};
    if (releaseForm.accountNumber) body.accountNumber = releaseForm.accountNumber;
    if (releaseForm.bankCode) body.bankCode = releaseForm.bankCode;
    if (releaseForm.accountName) body.accountName = releaseForm.accountName;

    release(
      { id: showRelease, data: body },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          setShowRelease(null);
          setReleaseForm({ accountNumber: "", bankCode: "", accountName: "" });
        },
        onError: (err: any) => {
          setReleaseError(err?.response?.data?.error ?? "Transfer failed");
        },
      },
    );
  };

  const pendingRef = typeof window !== "undefined" ? sessionStorage.getItem("pending_paystack_ref") : null;

  const totalPending = data?.payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalEscrowed = data?.payments.filter((p) => p.status === "escrowed").reduce((s, p) => s + p.amount, 0) ?? 0;
  const totalReleased = data?.payments.filter((p) => p.status === "released").reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground text-sm">Escrow-protected payments via Paystack</p>
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

      {/* Pending verification banner */}
      {pendingRef && (
        <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">You have a payment awaiting verification</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Complete checkout in the tab you opened, then click Verify.</p>
            {verifyMsg && <p className="text-xs mt-1 font-medium text-amber-700 dark:text-amber-300">{verifyMsg}</p>}
          </div>
          <button
            onClick={handleVerifyPending}
            disabled={verifying}
            className="shrink-0 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Verify Payment"}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xl font-bold text-muted-foreground">{formatCurrency(totalPending)}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xl font-bold text-primary">{formatCurrency(totalEscrowed)}</div>
          <div className="text-sm text-muted-foreground">In Escrow</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xl font-bold text-foreground">{formatCurrency(totalReleased)}</div>
          <div className="text-sm text-muted-foreground">{profile?.role === "freelancer" ? "Total Earned" : "Total Released"}</div>
        </div>
      </div>

      {/* Escrow explainer */}
      <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">How Escrow Works</h3>
        <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5 list-decimal list-inside">
          <li>Client creates a payment — funds are charged via Paystack and held in escrow</li>
          <li>Work is completed by the freelancer</li>
          <li>Client releases the payment — funds are transferred directly to the freelancer's bank account</li>
        </ol>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !data?.payments.length ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <svg className="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-muted-foreground font-medium">No payments yet</p>
          {profile?.role === "client" && (
            <p className="text-sm text-muted-foreground mt-1">Create a payment to escrow funds for a freelancer</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data.payments.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{p.jobTitle ?? `Job #${p.jobId}`}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {profile?.role === "freelancer"
                      ? `From ${p.clientName ?? "Client"}`
                      : `To ${p.freelancerName ?? "Freelancer"}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-x-2">
                    <span>{formatRelative(p.createdAt)}</span>
                    {p.releasedAt && <span>· Released {formatDate(p.releasedAt)}</span>}
                    {p.paystackReference && (
                      <span className="font-mono opacity-60">ref: {p.paystackReference.slice(-8)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-primary">{formatCurrency(p.amount)}</div>
                  <StatusBadge status={p.status} />
                  {p.status === "escrowed" && profile?.role === "client" && profile.id === p.clientId && (
                    <button
                      onClick={() => { setShowRelease(p.id); setReleaseError(""); }}
                      className="mt-2 block text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Release to Freelancer
                    </button>
                  )}
                  {p.status === "pending" && profile?.role === "client" && (
                    <button
                      onClick={() => {
                        sessionStorage.setItem("pending_paystack_ref", p.paystackReference ?? "");
                        handleVerifyPending();
                      }}
                      disabled={verifying}
                      className="mt-2 block text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50"
                    >
                      Verify Payment
                    </button>
                  )}
                  {p.paystackTransferCode && (
                    <div className="mt-1 text-xs text-green-600 font-mono">Transfer sent</div>
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
            <p className="text-sm text-muted-foreground mb-4">
              Funds will be charged to your card via Paystack and held securely in escrow until you release them.
            </p>
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₵</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
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
                <button
                  type="submit"
                  disabled={creating || !paystackReady}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? "Initializing..." : "Pay with Paystack"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release payment modal */}
      {showRelease !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Release Payment to Freelancer</h2>
              <button onClick={() => setShowRelease(null)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Provide the freelancer's bank details to transfer funds. This action is irreversible.
            </p>
            <form onSubmit={handleRelease} className="space-y-4">
              {releaseError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {releaseError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Account Number *</label>
                <input
                  type="text"
                  required
                  value={releaseForm.accountNumber}
                  onChange={(e) => setReleaseForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="e.g. 0123456789"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bank Code *</label>
                <input
                  type="text"
                  required
                  value={releaseForm.bankCode}
                  onChange={(e) => setReleaseForm((f) => ({ ...f, bankCode: e.target.value }))}
                  placeholder="e.g. 030100 (GCB Bank)"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Account Name *</label>
                <input
                  type="text"
                  required
                  value={releaseForm.accountName}
                  onChange={(e) => setReleaseForm((f) => ({ ...f, accountName: e.target.value }))}
                  placeholder="Full name on the account"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                This will initiate a bank transfer via Paystack. Make sure the details are correct before proceeding.
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowRelease(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={releasing}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {releasing ? "Transferring..." : "Release Funds"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
