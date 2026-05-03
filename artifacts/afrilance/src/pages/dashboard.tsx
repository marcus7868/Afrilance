import { Link } from "wouter";
import {
  useGetMyProfile,
  useGetFreelancerDashboard,
  useGetClientDashboard,
  getGetFreelancerDashboardQueryKey,
  getGetClientDashboardQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBudget, formatRelative, formatCurrency } from "@/lib/format";

function StatCard({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className ?? ""}`}>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function FreelancerDashboard() {
  const { data, isLoading } = useGetFreelancerDashboard({
    query: { queryKey: getGetFreelancerDashboardQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Applications" value={data.totalApplications} />
        <StatCard label="Pending" value={data.pendingApplications} />
        <StatCard label="Accepted" value={data.acceptedApplications} />
        <StatCard label="Total Earned" value={formatCurrency(data.totalEarnings)} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Recent Proposals</h3>
          <Link to="/proposals" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {data.recentProposals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-3">No proposals yet</p>
            <Link to="/jobs" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentProposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-foreground">{p.jobTitle ?? "Untitled Job"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatRelative(p.createdAt)}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/jobs" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium text-foreground">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Available Jobs
            </Link>
            <Link to="/messages" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium text-foreground">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              View Messages
              {data.unreadMessages > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">{data.unreadMessages}</span>
              )}
            </Link>
            <Link to="/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium text-foreground">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Edit Profile
            </Link>
          </div>
        </div>
        <div className="bg-primary text-primary-foreground rounded-xl p-5">
          <h3 className="font-semibold mb-1">Your stats</h3>
          <div className="text-4xl font-bold text-secondary">{data.completedJobs}</div>
          <div className="text-sm text-primary-foreground/70">Jobs completed</div>
          {data.avgRating && (
            <div className="mt-3 text-sm">
              Average rating: <span className="font-bold text-secondary">{data.avgRating.toFixed(1)} ★</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientDashboard() {
  const { data, isLoading } = useGetClientDashboard({
    query: { queryKey: getGetClientDashboardQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={data.totalJobs} />
        <StatCard label="Open Jobs" value={data.openJobs} />
        <StatCard label="Proposals Received" value={data.totalProposalsReceived} />
        <StatCard label="Total Spent" value={formatCurrency(data.totalSpent)} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Recent Jobs</h3>
          <Link to="/jobs/my" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {data.recentJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-3">No jobs posted yet</p>
            <Link to="/jobs/post" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Post Your First Job
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentJobs.map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/60 transition-colors">
                <div>
                  <div className="text-sm font-medium text-foreground">{job.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {job.proposalCount} proposals · {formatBudget(job.budgetMin, job.budgetMax, job.budgetType)}
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/jobs/post" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium text-foreground">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post a New Job
            </Link>
            <Link to="/freelancers" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium text-foreground">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Browse Freelancers
            </Link>
            <Link to="/messages" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium text-foreground">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Messages
              {data.unreadMessages > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">{data.unreadMessages}</span>
              )}
            </Link>
          </div>
        </div>
        <div className="bg-secondary text-primary rounded-xl p-5">
          <h3 className="font-semibold mb-1">Active now</h3>
          <div className="text-4xl font-bold">{data.inProgressJobs}</div>
          <div className="text-sm text-primary/70">Jobs in progress</div>
          <div className="mt-3 text-sm">
            {data.openJobs} job{data.openJobs !== 1 ? "s" : ""} still open
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: profile, isLoading } = useGetMyProfile();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {profile?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {profile?.role === "freelancer" ? "Find your next opportunity" : "Manage your projects"}
        </p>
      </div>

      {profile?.role === "freelancer" && <FreelancerDashboard />}
      {profile?.role === "client" && <ClientDashboard />}
      {profile?.role === "admin" && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-muted-foreground mb-4">You have admin access to this platform.</p>
          <Link to="/admin" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            Go to Admin Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
