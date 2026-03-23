import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";

import Header from "../components/header";

import appCss from "../index.css?url";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Incident Ops Demo",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="page-shell grid-noise grid min-h-screen grid-rows-[auto_1fr]">
          <Header />
          <Outlet />
        </div>
        <Toaster theme="dark" richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}
