import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@falcon/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@falcon/ui/components/card";
import { Link } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
  const healthCheck = useQuery<string>((orpc as any).healthCheck.queryOptions());

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <section className="grid gap-6 border border-border/70 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22rem)] p-6">
        <pre className="overflow-x-auto font-mono text-[10px] leading-tight text-muted-foreground">
          {TITLE_TEXT}
        </pre>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
              Falcon Connect V1
            </p>
            <h1 className="max-w-3xl text-4xl font-medium tracking-tight">
              Registry and verification infrastructure for directional app-to-app integrations
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Falcon Connect centralizes trusted app registration, install intents, consent-state,
              and runtime verification. The control plane knows which app is connected to which app
              for a Falcon subject and organization. The data exchange still happens directly
              between partner applications.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/dashboard">
                <Button>
                  Open ops console
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Server Health</CardTitle>
              <CardDescription>Dashboard-to-server control plane connectivity.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-sm">
                <div
                  className={`h-2 w-2 rounded-full ${
                    healthCheck.data ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <span className="text-muted-foreground">
                  {healthCheck.isLoading
                    ? "Checking Falcon Connect server"
                    : healthCheck.data
                      ? "Falcon Connect server reachable"
                      : "Falcon Connect server unavailable"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Registry</CardTitle>
            <CardDescription>
              Staff-managed partner apps with declared scopes, callback allowlists, and public keys.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Install Intents</CardTitle>
            <CardDescription>
              Source apps create pending requests in Falcon before users are redirected to the
              target app’s consent screen.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
            <CardDescription>
              Source apps mint short-lived Falcon-signed runtime tokens. Target apps verify locally
              and introspect on fallback.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}
