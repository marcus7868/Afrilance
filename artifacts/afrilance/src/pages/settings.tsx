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
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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
              <label className="block text-sm font-medium text-foreground mb-1.5">Hourly Rate (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={form.hourlyRate}
                  onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                  placeholder="50"
                  className="w-full pl-7 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
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
