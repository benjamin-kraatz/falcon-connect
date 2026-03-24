import type { RouterClient } from "@orpc/server";

import {
  getOpsOverview,
  listAuditEvents,
  listConnections,
  listInstallIntents,
  listTrustedApps,
  updateConnectionStatus,
} from "../connect";
import { protectedProcedure, publicProcedure } from "../index";
import { z } from "zod";

const updateConnectionStatusInputSchema = z.object({
  connectionId: z.string().min(1),
  status: z.enum(["active", "paused", "revoked"]),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  ops: {
    overview: protectedProcedure.handler(() => getOpsOverview()),
    trustedApps: protectedProcedure.handler(() => listTrustedApps()),
    installIntents: protectedProcedure.handler(() => listInstallIntents()),
    connections: protectedProcedure.handler(() => listConnections()),
    auditEvents: protectedProcedure.handler(() => listAuditEvents()),
    updateConnectionStatus: protectedProcedure
      .input(updateConnectionStatusInputSchema)
      .handler(({ input }) => updateConnectionStatus(input)),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
