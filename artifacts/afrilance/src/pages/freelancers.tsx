import { useState } from "react";
import { Link } from "wouter";
import { useListFreelancers, getListFreelancersQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillBadge } from "@/components/SkillBadge";
import { StarRating } from "@/components/StarRating";
import { UserAvatar } from "@/components/UserAvatar";

const CATEGORIES = [
  "Software Development", "Design & Creative", "Writing & Content",
  "Digital Marketing", "Data Science", "Video & Animation",
  "Music & Audio", "Business", "Engineering & Architecture",
  "Legal", "Finance & Accounting", "Customer Service", "Consulting",
];

const PAGE_SIZE = 12;

export default function FreelancersPage() {
  const [filters, setFilters] = useState({
    search: "",
    skill: "",
    location: "",
    minRate: "",
    maxRate: "",
  });
  const [page, setPage] = useState(0);

  const queryParams = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.skill ? { skill: filters.skill } : {}),
    ...(filters.location ? { location: filters.location } : {}),
    ...(filters.minRate ? { minRate: parseFloat(filters.minRate) } : {}),
    ...(filters.maxRate ? { maxRate: parseFloat(filters.maxRate) } : {}),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, isLoading } = useListFreelancers(queryParams, {
    query: { queryKey: getListFreelancersQueryKey(queryParams) },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Find Talent</h1>
        <p className="text-muted-foreground text-sm">Discover skilled African freelancers for your projects</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <aside className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5 sticky top-20">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Search</label>
              <input
                type="search"
                value={filters.search}
                onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(0); }}
                placeholder="Search freelancers..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Skill</label>
              <input
                type="text"
                value={filters.skill}
                onChange={(e) => { setFilters((f) => ({ ...f, skill: e.target.value })); setPage(0); }}
                placeholder="e.g. React"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => { setFilters((f) => ({ ...f, location: e.target.value })); setPage(0); }}
                placeholder="e.g. Lagos"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Hourly Rate (GHS/hr)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.minRate}
                  onChange={(e) => { setFilters((f) => ({ ...f, minRate: e.target.value })); setPage(0); }}
                  placeholder="Min"
                  className="w-1/2 px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="number"
                  value={filters.maxRate}
                  onChange={(e) => { setFilters((f) => ({ ...f, maxRate: e.target.value })); setPage(0); }}
                  placeholder="Max"
                  className="w-1/2 px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <button
              onClick={() => { setFilters({ search: "", skill: "", location: "", minRate: "", maxRate: "" }); setPage(0); }}
              className="w-full py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Freelancer grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : data?.freelancers.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl">
              <svg className="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-muted-foreground font-medium">No freelancers found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{data?.total ?? 0} freelancers found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.freelancers.map((f) => (
                  <Link
                    key={f.id}
                    to={`/freelancers/${f.id}`}
                    className="group block bg-card border border-border rounded-xl p-5 hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar name={f.name} avatarUrl={f.avatarUrl} size="lg" />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {f.name}
                        </div>
                        {f.category && (
                          <div className="text-xs text-muted-foreground truncate">{f.category}</div>
                        )}
                        {f.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span className="truncate">{f.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {f.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{f.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-3">
                      {f.skills.slice(0, 3).map((s) => <SkillBadge key={s} skill={s} />)}
                      {f.skills.length > 3 && (
                        <span className="text-xs text-muted-foreground self-center">+{f.skills.length - 3}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {f.avgRating ? (
                        <StarRating rating={f.avgRating} total={f.totalReviews} />
                      ) : (
                        <span className="text-xs text-muted-foreground">No reviews yet</span>
                      )}
                      {f.hourlyRate && (
                        <span className="text-sm font-semibold text-primary">₵{f.hourlyRate}/hr</span>
                      )}
                    </div>

                    {f.featured && (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-secondary">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Top Rated
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
