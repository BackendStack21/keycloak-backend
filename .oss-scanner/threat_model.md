# Threat model — keycloak-backend

## What this project does and where untrusted input enters
- keycloak-backend is a TypeScript Node.js connector for backend services to integrate with Keycloak: verifying/decoding access tokens (offline with a public key, or online via the `userinfo` endpoint) and obtaining service-account access tokens.
- Untrusted: access tokens (JWTs) presented by clients, and every claim inside them.
- Semi-trusted: responses from the configured Keycloak server (it is the identity provider, but transport and parsing should be robust).
- Trusted: library configuration (realm, Keycloak URL/prefix, client id and secret, certificates) supplied by the application.

## Components that matter most / least
- In scope, highest priority: `libs/Jwt.ts` (`verifyOffline`, `verify`, `decode`), `libs/Token.ts` (claim parsing, expiry, role checks), `libs/AccessToken.ts` (client credentials flow, token caching/refresh).
- In scope: `libs/Keycloak.ts`, `libs/index.ts` (config and HTTP client setup).
- Out of scope: `example/`, `local/`, `tests/`, `dist/` (build output), devDependencies.

## How to exercise it
- `npm run test:coverage` runs the jest unit tests in `tests/` (HTTP calls are mocked with axios-mock-adapter).
- The integration suite (`npm run test:integration`) needs a live Keycloak via docker compose and is not available offline.

## How you rate severity
- Critical: accepting a forged or unsigned token as verified (algorithm confusion, `alg: none`, key confusion), or role/permission checks in `Token` that grant access the claims do not support.
- High: accepting expired or wrong-audience/issuer tokens when the caller requested those checks; leaking the client secret or service access token; a malformed token that crashes the host process.
- Medium: URL/path/header injection into Keycloak requests via tokens or other caller-supplied input, service access-token cache returning a token for the wrong scope.
- Low: hardening suggestions, unsafe-by-name APIs that are documented (e.g. `decode` performs no verification by design).

## Anything to leave alone
- `Jwt.decode()` not verifying signatures is documented intended behavior.
- Advisories that only affect devDependencies.
