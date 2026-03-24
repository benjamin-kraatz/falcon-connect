import { createFileRoute } from "@tanstack/react-router";

import { verifyRuntimeRequest } from "@/lib/target-server";

export const Route = createFileRoute("/api/runtime/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { token?: string };

          if (!body.token) {
            return Response.json({ message: "Token is required" }, { status: 400 });
          }

          const forwardedRequest = new Request(request.url, {
            method: "POST",
            headers: {
              authorization: `Bearer ${body.token}`,
              "x-demo-verification-mode":
                request.headers.get("x-demo-verification-mode") ?? "local",
            },
          });
          const verified = await verifyRuntimeRequest(forwardedRequest, "incidents:read");

          return Response.json({
            verification: verified.verification,
            tokenPreview: `${body.token.slice(0, 28)}...${body.token.slice(-18)}`,
          });
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Verification failed" },
            { status: 401 },
          );
        }
      },
    },
  },
});
