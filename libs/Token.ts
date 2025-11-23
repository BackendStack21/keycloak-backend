import { decode } from "jsonwebtoken";

/**
 * Parsed JWT content. Most fields are the standard OIDC claims. Extra
 * fields are optional and intentionally flattened into the interface to
 * make them easily accessible when present.
 */
export interface ITokenContent {
  [key: string]: any;

  /**
   * Authorization server’s identifier
   */
  iss: string;

  /**
   * User’s identifier
   */
  sub: string;

  /**
   * Client’s identifier
   */
  aud: string | string[];

  /**
   * Expiration time of the ID token
   */
  exp: number;

  /**
   * Time at which JWT was issued
   */
  iat: number;

  family_name?: string;
  given_name?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  email_verified?: boolean;
}

/**
 * Wrapper around a raw token string that provides convenience methods and
 * a strongly-typed `content` object with the standard token claims. The
 * constructor decodes the JWT without verifying signatures — callers
 * should use `Jwt.verify` or `Jwt.verifyOffline` for verification.
 */
export class Token {
  public readonly token: string;
  public readonly content: ITokenContent;

  /**
   * Construct a Token wrapper around a raw JWT string. The constructor
   * decodes the payload (without verifying cryptographic signature).
   * Callers should verify tokens before trusting them.
   *
   * @param token - Raw JWT access token string
   * @throws {Error} when mandatory OIDC claims (`iss`, `sub`, `aud`, `exp`, `iat`) are missing
   * @example
   * const token = new Token('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...')
   */
  constructor(token: string) {
    this.token = token;
    const payload = decode(this.token, { json: true });
    // Basic structural validation: ensure the standard claims exist.
    // Note: Keycloak may use 'azp' (authorized party) instead of 'aud' for access tokens
    const aud = payload?.aud ?? payload?.azp;
    if (
      payload?.iss !== undefined &&
      payload?.sub !== undefined &&
      aud !== undefined &&
      payload?.exp !== undefined &&
      payload?.iat !== undefined
    ) {
      this.content = {
        ...payload,
        iss: payload.iss,
        sub: payload.sub,
        aud: aud,
        exp: payload.exp,
        iat: payload.iat,
      };
    } else {
      // If core OIDC claims are missing we don't attempt to work with the
      // token and instead fail fast with an explanatory error.
      throw new Error("Invalid token");
    }
  }

  /**
   * Check whether the token has expired using the `exp` claim.
   *
   * @returns true when token is expired
   * @example
   * token.isExpired() // => true or false
   */
  isExpired(): boolean {
    return this.content.exp * 1000 <= Date.now();
  }

  /**
   * Check whether the token contains a role for a specific application
   * (client). Returns false if the claim is missing.
   *
   * @param appName - Client/application name
   * @param roleName - Role name to check
   * @returns true when the role exists for the application
   * @example
   * token.hasApplicationRole('my-app', 'viewer') // => true | false
   */
  hasApplicationRole(appName: string, roleName: string): boolean {
    if (this.content.resource_access == null) {
      return false;
    }
    const appRoles = this.content.resource_access[appName];
    if (appRoles == null || appRoles.roles == null) {
      return false;
    }

    return appRoles.roles.indexOf(roleName) >= 0;
  }

  /**
   * Check whether the token contains a realm role.
   *
   * @param roleName - Realm role name to check
   * @returns true when the role exists in the `realm_access.roles` claim
   * @example
   * token.hasRealmRole('admin') // => true | false
   */
  hasRealmRole(roleName: string): boolean {
    if (this.content.realm_access == null || this.content.realm_access.roles == null) {
      return false;
    }
    return this.content.realm_access.roles.indexOf(roleName) >= 0;
  }
}
