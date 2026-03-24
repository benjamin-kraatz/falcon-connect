import { createFileRoute } from "@tanstack/react-router";

import { selectRunbooks, verifyRuntimeRequest } from "@/lib/target-server";

export const Route = createFileRoute("/api/runtime/runbooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { serviceIds?: string[]; projectId?: string };
          const verified = await verifyRuntimeRequest(request, "runbooks:read");

          return Response.json({
            verification: verified.verification,
            data: {
              projectId: body.projectId ?? null,
              runbooks: selectRunbooks(body.serviceIds ?? []),
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
