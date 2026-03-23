import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/dashboard/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("connect");

export const dashboard = await TanStackStart("dashboard", {
  cwd: "../../apps/dashboard",
  bindings: {
    VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL!,
    DATABASE_URL: alchemy.secret.env.DATABASE_URL!,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
    DATABASE_AUTH_TOKEN: alchemy.secret.env.DATABASE_AUTH_TOKEN!,
  },
});

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    DATABASE_URL: alchemy.secret.env.DATABASE_URL!,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
    DATABASE_AUTH_TOKEN: alchemy.secret.env.DATABASE_AUTH_TOKEN!,
    VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL!,
    FALCON_CONNECT_SERVER_URL: alchemy.env.FALCON_CONNECT_SERVER_URL!,
    FALCON_CONNECT_SIGNING_PRIVATE_JWK: alchemy.secret.env.FALCON_CONNECT_SIGNING_PRIVATE_JWK!,
    FALCON_CONNECT_SIGNING_KEY_ID: alchemy.env.FALCON_CONNECT_SIGNING_KEY_ID!,
  },
  dev: {
    port: 3000,
  },
});

console.log(`Dashboard -> ${dashboard.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
