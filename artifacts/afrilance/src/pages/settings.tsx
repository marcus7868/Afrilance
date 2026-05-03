import { useState, useEffect } from "react";
import {
  useGetMyProfile,
  useUpsertMyProfile,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";

const CATEGORIES = [
  "Software Development", "Design & Creative", "Writing & Content",
  "Digital Marketing", "Data Science", "Video & Animation",
  "Music & Audio", "Business", "Engineering & Architecture",
  "Legal", "Finance & Accounting", "Customer Service", "Consulting",
];

type PortfolioItem = {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  projectUrl?: string | null;
};

let nextPortfolioId = Date.now();

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() },
  });
  const { mutate, isPending } = useUpsertMyProfile();

  const [form, setForm] = useState({
    name: "",
    bio: "",
    location: "",
    skills: [] as string[],
    newSkill: "",
    hourlyRate: "",
    category: "",
    portfolioItems: [] as PortfolioItem[],
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [portfolioTab, setPortfolioTab] = useState<"list" | "add" | number>("list");
  const [portfolioForm, setPortfolioForm] = useState({ title: "", description: "", imageUrl: "", projectUrl: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        skills: profile.skills ?? [],
        newSkill: "",
        hourlyRate: profile.hourlyRate != null ? String(profile.hourlyRate) : "",
        category: profile.category ?? "",
        portfolioItems: (profile.portfolioItems ?? []) as PortfolioItem[],
      });
    }
  }, [profile]);

  const addSkill = () => {
    const skill = form.newSkill.trim();
    if (skill && !form.skills.includes(skill)) {
      setForm((f) => ({ ...f, skills: [...f.skills, skill], newSkill: "" }));
    }
  };

  const removeSkill = (skill: string) => {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  };

  const addPortfolioItem = () => {
    if (!portfolioForm.title.trim()) return;
    const newItem: PortfolioItem = {
      id: ++nextPortfolioId,
      title: portfolioForm.title.trim(),
      description: portfolioForm.description.trim() || null,
      imageUrl: portfolioForm.imageUrl.trim() || null,
      projectUrl: portfolioForm.projectUrl.trim() || null,
    };
    setForm((f) => ({ ...f, portfolioItems: [...f.portfolioItems, newItem] }));
    setPortfolioForm({ title: "", description: "", imageUrl: "", projectUrl: "" });
    setPortfolioTab("list");
  };

  const removePortfolioItem = (id: number) => {
    setForm((f) => ({ ...f, portfolioItems: f.portfolioItems.filter((p) => p.id !== id) }));
  };

  const editPortfolioItem = (id: number) => {
    const item = form.portfolioItems.find((p) => p.id === id);
    if (!item) return;
    setPortfolioForm({
      title: item.title,
      description: item.description ?? "",
      imageUrl: item.imageUrl ?? "",
      projectUrl: item.projectUrl ?? "",
    });
    setPortfolioTab(id);
  };

  const savePortfolioEdit = (id: number) => {
    if (!portfolioForm.title.trim()) return;
    setForm((f) => ({
      ...f,
      portfolioItems: f.portfolioItems.map((p) =>
        p.id === id
          ? { ...p, title: portfolioForm.title.trim(), description: portfolioForm.description.trim() || null, imageUrl: portfolioForm.imageUrl.trim() || null, projectUrl: portfolioForm.projectUrl.trim() || null }
          : p,
      ),
    }));
    setPortfolioForm({ title: "", description: "", imageUrl: "", projectUrl: "" });
    setPortfolioTab("list");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setError("");
    setSuccess(false);
    mutate(
      {
        data: {
          role: profile?.role ?? "freelancer",
          name: form.name.trim(),
          bio: form.bio.trim() || null,
          location: form.location.trim() || null,
          skills: form.skills,
          hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
          category: form.category || null,
          portfolioItems: form.portfolioItems,
        },
      },
      {
        onSuccess: () => {
          setSuccess(true);
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
          setTimeout(() => setSuccess(false), 3000);
        },
        onError: () => {
          setError("Failed to update profile. Please try again.");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const isEditing = typeof portfolioTab === "number";
  const isAddingPortfolio = portfolioTab === "add";
  const showPortfolioForm = isEditing || isAddingPortfolio;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground text-sm">Update your public profile information</p>
      </div>

      {/* Profile preview */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-card border border-border rounded-xl">
        <UserAvatar name={profile?.name} avatarUrl={profile?.avatarUrl} size="lg" />
        <div>
          <div className="font-semibold text-foreground">{profile?.name}</div>
          <div className="text-sm text-muted-foreground capitalize">{profile?.role}</div>
          {profile?.completedJobs != null && (
            <div className="text-xs text-muted-foreground">{profile.completedJobs} jobs completed</div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 space-y-5">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            Profile updated successfully!
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
          <textarea
            rows={4}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Tell people about yourself..."
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Lagos, Nigeria"
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {profile?.role === "freelancer" && (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Skills</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.newSkill}
                  onChange={(e) => setForm((f) => ({ ...f, newSkill: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  placeholder="Add a skill"
                  className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button type="button" onClick={addSkill} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
                  Add
                </button>
              </div>
              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent text-accent-foreground rounded-lg text-xs font-medium">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="text-muted-foreground hover:text-foreground">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Hourly Rate (GHS)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₵</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={form.hourlyRate}
                  onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                  placeholder="50"
                  className="w-full pl-7 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            {/* Portfolio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Portfolio / Work Samples</label>
                {!showPortfolioForm && (
                  <button
                    type="button"
                    onClick={() => { setPortfolioForm({ title: "", description: "", imageUrl: "", projectUrl: "" }); setPortfolioTab("add"); }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    + Add item
                  </button>
                )}
              </div>

              {showPortfolioForm ? (
                <div className="border border-border rounded-xl p-4 bg-background space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {isEditing ? "Edit Portfolio Item" : "New Portfolio Item"}
                  </p>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Title *</label>
                    <input
                      type="text"
                      value={portfolioForm.title}
                      onChange={(e) => setPortfolioForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Project name"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={portfolioForm.description}
                      onChange={(e) => setPortfolioForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What did you build?"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Image URL</label>
                    <input
                      type="url"
                      value={portfolioForm.imageUrl}
                      onChange={(e) => setPortfolioForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Project URL</label>
                    <input
                      type="url"
                      value={portfolioForm.projectUrl}
                      onChange={(e) => setPortfolioForm((f) => ({ ...f, projectUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => isEditing ? savePortfolioEdit(portfolioTab as number) : addPortfolioItem()}
                      disabled={!portfolioForm.title.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40"
                    >
                      {isEditing ? "Save Changes" : "Add Item"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPortfolioTab("list"); setPortfolioForm({ title: "", description: "", imageUrl: "", projectUrl: "" }); }}
                      className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : form.portfolioItems.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                  No portfolio items yet. Add your best work to impress clients!
                </div>
              ) : (
                <div className="space-y-2">
                  {form.portfolioItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border border-border rounded-xl bg-background">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-muted" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{item.title}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</div>
                        )}
                        {item.projectUrl && (
                          <a href={item.projectUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-0.5 block truncate" onClick={(e) => e.stopPropagation()}>
                            {item.projectUrl}
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button type="button" onClick={() => editPortfolioItem(item.id)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => removePortfolioItem(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setPortfolioForm({ title: "", description: "", imageUrl: "", projectUrl: "" }); setPortfolioTab("add"); }}
                    className="w-full py-2 text-xs text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors font-medium"
                  >
                    + Add another item
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
