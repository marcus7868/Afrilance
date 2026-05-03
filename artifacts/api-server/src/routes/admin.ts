import { Router } from "express";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  db,
  profilesTable,
  jobsTable,
  proposalsTable,
  paymentsTable,
} from "@workspace/db";
import {
  AdminListUsersQueryParams,
  AdminBlockUserParams,
  AdminBlockUserBody,
  AdminListJobsQueryParams,
  AdminFlagJobParams,
  AdminFlagJobBody,
} from "@workspace/api-zod";
import { z } from "zod";

const AdminVerifyUserParams = z.object({ id: z.coerce.number().int() });
const AdminVerifyUserBody = z.object({
  isVerified: z.boolean().optional(),
  isTopRated: z.boolean().optional(),
  verificationStatus: z.enum(["none", "pending", "approved", "rejected"]).optional(),
});

const router = Router();

async function requireAdmin(userId: string) {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  if (!profile || profile.role !== "admin") return null;
  return profile;
}

// GET /admin/users
router.get("/admin/users", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const admin = await requireAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { role, search, limit = 50, offset = 0 } = parsed.data;
  const conditions = [];
  if (role) conditions.push(eq(profilesTable.role, role));
  if (search) {
    conditions.push(ilike(profilesTable.name, `%${search}%`));
  }

  const users = await db
    .select()
    .from(profilesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(Number(limit))
    .offset(Number(offset))
    .orderBy(desc(profilesTable.createdAt));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(profilesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ users, total: Number(count) });
});

// PATCH /admin/users/:id/block
router.patch("/admin/users/:id/block", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const admin = await requireAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = AdminBlockUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminBlockUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(profilesTable)
    .set({ isBlocked: parsed.data.isBlocked })
    .where(eq(profilesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updated);
});

// PATCH /admin/users/:id/verify
router.patch("/admin/users/:id/verify", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await requireAdmin(userId);
  if (!admin) { res.status(403).json({ error: "Admin access required" }); return; }

  const params = AdminVerifyUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = AdminVerifyUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, boolean | string> = {};
  if (parsed.data.isVerified !== undefined) updateData.isVerified = parsed.data.isVerified;
  if (parsed.data.isTopRated !== undefined) updateData.isTopRated = parsed.data.isTopRated;
  if (parsed.data.verificationStatus !== undefined) updateData.verificationStatus = parsed.data.verificationStatus;

  const [updated] = await db
    .update(profilesTable)
    .set(updateData)
    .where(eq(profilesTable.id, params.data.id))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

// GET /admin/jobs
router.get("/admin/jobs", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const admin = await requireAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = AdminListJobsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, flagged, limit = 50, offset = 0 } = parsed.data;
  const conditions = [];
  if (status) conditions.push(eq(jobsTable.status, status));
  if (flagged === true) conditions.push(eq(jobsTable.isFlagged, true));

  const jobs = await db
    .select({
      id: jobsTable.id,
      clientId: jobsTable.clientId,
      title: jobsTable.title,
      description: jobsTable.description,
      category: jobsTable.category,
      skills: jobsTable.skills,
      budgetMin: jobsTable.budgetMin,
      budgetMax: jobsTable.budgetMax,
      budgetType: jobsTable.budgetType,
      location: jobsTable.location,
      remote: jobsTable.remote,
      deadline: jobsTable.deadline,
      status: jobsTable.status,
      isFlagged: jobsTable.isFlagged,
      proposalCount: jobsTable.proposalCount,
      createdAt: jobsTable.createdAt,
      updatedAt: jobsTable.updatedAt,
      clientName: profilesTable.name,
      clientAvatarUrl: profilesTable.avatarUrl,
    })
    .from(jobsTable)
    .leftJoin(profilesTable, eq(jobsTable.clientId, profilesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(Number(limit))
    .offset(Number(offset))
    .orderBy(desc(jobsTable.createdAt));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ jobs, total: Number(count) });
});

// PATCH /admin/jobs/:id/flag
router.patch("/admin/jobs/:id/flag", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const admin = await requireAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = AdminFlagJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminFlagJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(jobsTable)
    .set({ isFlagged: parsed.data.isFlagged })
    .where(eq(jobsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({ ...updated, clientName: null, clientAvatarUrl: null });
});

// GET /admin/stats
router.get("/admin/stats", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const admin = await requireAdmin(userId);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(profilesTable);
  const [totalFreelancers] = await db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(eq(profilesTable.role, "freelancer"));
  const [totalClients] = await db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(eq(profilesTable.role, "client"));
  const [totalJobs] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable);
  const [totalProposals] = await db.select({ count: sql<number>`count(*)` }).from(proposalsTable);
  const [paymentsRow] = await db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(paymentsTable).where(eq(paymentsTable.status, "released"));
  const [activeJobs] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.status, "open"));
  const [flaggedJobs] = await db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.isFlagged, true));
  const [blockedUsers] = await db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(eq(profilesTable.isBlocked, true));

  res.json({
    totalUsers: Number(totalUsers.count),
    totalFreelancers: Number(totalFreelancers.count),
    totalClients: Number(totalClients.count),
    totalJobs: Number(totalJobs.count),
    totalProposals: Number(totalProposals.count),
    totalPayments: Number(paymentsRow.total),
    activeJobs: Number(activeJobs.count),
    flaggedJobs: Number(flaggedJobs.count),
    blockedUsers: Number(blockedUsers.count),
  });
});

export default router;
