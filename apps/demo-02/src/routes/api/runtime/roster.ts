import { createFileRoute } from "@tanstack/react-router";

import { selectRoster, verifyRuntimeRequest } from "@/lib/target-server";

export const Route = createFileRoute("/api/runtime/roster")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { serviceIds?: string[]; projectId?: string };
          const verified = await verifyRuntimeRequest(request, "oncall:read");

          return Response.json({
            verification: verified.verification,
            data: {
              projectId: body.projectId ?? null,
              roster: selectRoster(body.serviceIds ?? []),
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
