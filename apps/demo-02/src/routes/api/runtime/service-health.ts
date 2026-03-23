import { createFileRoute } from "@tanstack/react-router";

import { selectServiceHealth, verifyRuntimeRequest } from "@/lib/target-server";

export const Route = createFileRoute("/api/runtime/service-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { serviceIds?: string[]; projectId?: string };
          const verified = await verifyRuntimeRequest(request, "services:read");

          return Response.json({
            verification: verified.verification,
            data: {
              projectId: body.projectId ?? null,
              services: selectServiceHealth(body.serviceIds ?? []),
            },
          });
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Runtime verification failed" },
            { status: 401 },
          );
        }
      },
    },
  },
});
