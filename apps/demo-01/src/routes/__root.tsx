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
        title: "Project Hub Demo",
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
        <div className="grid min-h-screen w-full max-w-full grid-rows-[auto_1fr] overflow-x-hidden">
          <Header />
          <Outlet />
        </div>
        <Toaster theme="dark" richColors position="top-right" />
        <Scripts />
      </body>
    </html>
  );
}
