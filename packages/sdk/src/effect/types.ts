import { Schema } from "effect";

/**
 * A valid Falcon application identifier (255 chars max).
 */
export const AppId = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(255),
  Schema.brand("AppId"),
);
export type AppId = typeof AppId.Type;

/**
 * Intent token for a FALCON Connect install intent.
 */
export const IntentToken = Schema.String.pipe(Schema.brand("IntentToken"));
export type IntentToken = typeof IntentToken.Type;

/**
 * A valid Falcon request URL.
 */
export const FalconRequestUrl = Schema.URL.pipe(Schema.brand("FalconRequestUrl"));
export type FalconRequestUrl = typeof FalconRequestUrl.Type;
