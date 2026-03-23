import { generateKeyPairSync } from "node:crypto";

function readArg(flag, fallback) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return fallback;
  }

  return process.argv[index + 1] ?? fallback;
}

const mode = readArg("--mode", "trusted-app");
const keyId = readArg(
  "--key-id",
  mode === "falcon" ? "falcon-connect-signing-key-1" : "trusted-app-key-1",
);

if (!["trusted-app", "falcon"].includes(mode)) {
  console.error('Expected "--mode trusted-app" or "--mode falcon".');
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateJwk = privateKey.export({ format: "jwk" });
const publicJwk = publicKey.export({ format: "jwk" });

const privateEnvName =
  mode === "falcon" ? "FALCON_CONNECT_SIGNING_PRIVATE_JWK" : "FALCON_PRIVATE_JWK";
const keyIdEnvName = mode === "falcon" ? "FALCON_CONNECT_SIGNING_KEY_ID" : "FALCON_KEY_ID";

console.log(`# Generated ${mode} Ed25519 JWK pair`);
console.log("");
console.log("Private JWK:");
console.log(JSON.stringify(privateJwk));
console.log("");
console.log("Public JWK:");
console.log(JSON.stringify(publicJwk));
console.log("");
console.log("Suggested environment variables:");
console.log(`${privateEnvName}='${JSON.stringify(privateJwk)}'`);
console.log(`${keyIdEnvName}='${keyId}'`);
console.log("");
console.log("# Public JWK to register in Falcon:");
console.log(`PUBLIC_JWK_JSON='${JSON.stringify(publicJwk)}'`);
