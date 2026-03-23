import { createFileRoute } from "@tanstack/react-router";

import { selectIncidents, verifyRuntimeRequest } from "@/lib/target-server";

export const Route = createFileRoute("/api/runtime/incidents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { serviceIds?: string[]; projectId?: string };
          const verified = await verifyRuntimeRequest(request, "incidents:read");

          return Response.json({
            verification: verified.verification,
            data: {
              projectId: body.projectId ?? null,
              incidents: selectIncidents(body.serviceIds ?? []),
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
