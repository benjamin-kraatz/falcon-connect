import type { ResolvedInstallIntent, ResolvedInstallIntentScope } from "./protocol";

export type ConsentScopeSelection = ResolvedInstallIntentScope & {
  locked: boolean;
};

export function buildConsentSelection(
  intent: ResolvedInstallIntent,
  selectedScopeNames?: string[],
) {
  const selected = new Set(
    selectedScopeNames ??
      intent.scopes.filter((scope) => scope.selected).map((scope) => scope.name),
  );

  return intent.scopes.map((scope) => {
    const locked = scope.required || scope.system;

    return {
      ...scope,
      locked,
      selected: locked ? true : selected.has(scope.name),
    } satisfies ConsentScopeSelection;
  });
}

export function normalizeGrantedScopes(
  intent: ResolvedInstallIntent,
  selectedScopeNames?: string[],
) {
  return buildConsentSelection(intent, selectedScopeNames)
    .filter((scope) => scope.selected)
    .map((scope) => scope.name);
}
