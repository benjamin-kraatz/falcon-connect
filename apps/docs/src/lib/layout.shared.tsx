import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const gitConfig = {
  user: "benjamin-kraatz",
  repo: "falcon-connect",
  branch: "main",
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "FALCON Connect Docs",
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
