/**
 * Consent UI helpers for install flows, typed against `ResolvedInstallIntent` from `protocol.ts`.
 */
import type { ResolvedInstallIntent, ResolvedInstallIntentScope } from "./protocol";

/**
 * A scope row plus UI state: whether the row is locked (required/system) and whether it is selected.
 */
export type ConsentScopeSelection = ResolvedInstallIntentScope & {
  /** When true, the user cannot deselect this scope (required or system scope). */
  locked: boolean;
};

/**
 * Builds per-scope selection state for a consent screen from an optional explicit name list.
 *
 * If `selectedScopeNames` is omitted, initial selection is derived from each scope’s `selected` flag
 * on the resolved intent.
 *
 * @param intent - Server-resolved install intent (includes `scopes` with `required`, `system`, `selected`).
 * @param selectedScopeNames - Optional override: which scope names should be treated as selected
 *   (non-locked scopes honor this set; locked scopes stay selected).
 * @returns One entry per scope in `intent.scopes`, with `locked` and effective `selected` computed.
 */
export function buildConsentSelection(
  intent: ResolvedInstallIntent,
  selectedScopeNames?: ReadonlyArray<string>,
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

/**
 * Returns the list of scope **names** that should be sent as `grantedScopes` when approving an install
 * intent (after applying the same selection rules as {@link buildConsentSelection}).
 *
 * @param intent - Resolved intent used for scope metadata.
 * @param selectedScopeNames - Optional override passed through to {@link buildConsentSelection}.
 */
export function normalizeGrantedScopes(
  intent: ResolvedInstallIntent,
  selectedScopeNames?: ReadonlyArray<string>,
) {
  return buildConsentSelection(intent, selectedScopeNames)
    .filter((scope) => scope.selected)
    .map((scope) => scope.name);
}
