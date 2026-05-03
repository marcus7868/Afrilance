import { Router } from "express";
import { eq, or, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, paymentsTable, profilesTable, jobsTable } from "@workspace/db";
import {
  CreatePaymentBody,
  ReleasePaymentParams,
} from "@workspace/api-zod";

const router = Router();

async function requireProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  return profile;
}

function enrichPayment(p: typeof paymentsTable.$inferSelect, job?: typeof jobsTable.$inferSelect | null, freelancer?: typeof profilesTable.$inferSelect | null, client?: typeof profilesTable.$inferSelect | null) {
  return {
    ...p,
    jobTitle: job?.title ?? null,
    freelancerName: freelancer?.name ?? null,
    clientName: client?.name ?? null,
    releasedAt: p.releasedAt?.toISOString() ?? null,
  };
}

// GET /payments
router.get("/payments", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await requireProfile(userId);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const rows = await db
    .select()
    .from(paymentsTable)
    .where(
      or(
        eq(paymentsTable.clientId, profile.id),
        eq(paymentsTable.freelancerId, profile.id),
      ),
    )
    .orderBy(desc(paymentsTable.createdAt));

  const enriched = await Promise.all(
    rows.map(async (p) => {
      const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, p.jobId));
      const [freelancer] = await db.select().from(profilesTable).where(eq(profilesTable.id, p.freelancerId));
      const [client] = await db.select().from(profilesTable).where(eq(profilesTable.id, p.clientId));
      return enrichPayment(p, job, freelancer, client);
    }),
  );

  res.json({ payments: enriched, total: enriched.length });
});

// POST /payments
router.post("/payments", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await requireProfile(userId);
  if (!profile || profile.role !== "client") {
    res.status(403).json({ error: "Only clients can initiate payments" });
    return;
  }

  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      ...parsed.data,
      clientId: profile.id,
      status: "escrowed",
    })
    .returning();

  res.status(201).json(enrichPayment(payment, null, null, profile));
});

// PATCH /payments/:id/release
router.patch("/payments/:id/release", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ReleasePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const profile = await requireProfile(userId);
  if (!profile || existing.clientId !== profile.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [updated] = await db
    .update(paymentsTable)
    .set({ status: "released", releasedAt: new Date() })
    .where(eq(paymentsTable.id, params.data.id))
    .returning();

  res.json(enrichPayment(updated, null, null, null));
});

export default router;
