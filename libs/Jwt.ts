import { Token } from "./Token";
import { verify, VerifyOptions } from "jsonwebtoken";
import { IInternalConfig } from "./index";
import { AxiosInstance } from "axios";

/**
 * JWT helper for verifying and decoding tokens. Supports both server-side
 * verification (online via Keycloak HTTP call) and offline signature
 * verification using a public certificate.
 */
export class Jwt {
  constructor(private readonly config: IInternalConfig, private readonly request: AxiosInstance) {}

  /**
   * Verify token offline using a public certificate.
   * Defaults to `RS256` algorithm allowed list for safety.
   *
   * @param accessToken - JWT string to be verified
   * @param cert - Public certificate or key used for verification
   * @param options - Optional jsonwebtoken VerifyOptions
   * @returns A Promise resolving to a `Token` instance if verification succeeds
   * @throws {Error} When verification fails (signature mismatch or invalid token)
   * @example
   * const token = await jwt.verifyOffline('ey...', pubKey)
   */
  async verifyOffline(accessToken: string, cert: any, options?: VerifyOptions): Promise<Token> {
    const verifyOptions: VerifyOptions = {
      algorithms: ["RS256"],
      ...options,
    };
    return await new Promise((resolve, reject) => {
      verify(accessToken, cert, verifyOptions, (err) => {
        if (err != null) reject(err);
        resolve(new Token(accessToken));
      });
    });
  }

  /**
   * Decode a token into a `Token` wrapper without performing cryptographic
   * verification. Useful in contexts where the token will be inspected
   * but not trusted until verified by other means.
   *
   * @param accessToken - The JWT string to decode
   * @returns A `Token` instance containing the parsed payload
   * @example
   * const token = jwt.decode('ey...')
   */
  decode(accessToken: string): Token {
    return new Token(accessToken);
  }

  /**
   * Online verification that performs a Keycloak server `userinfo` call
   * to make sure the token is still valid on the server-side. If the
   * call completes successfully the token is accepted and returned as a
   * `Token` wrapper for callers to inspect claims.
   *
   * @param accessToken - The JWT string to verify via Keycloak server
   * @returns A Promise resolving to a `Token` instance when userinfo succeeds
   * @throws {AxiosError} When the `userinfo` endpoint returns a non-2xx response
   * @example
   * const token = await jwt.verify('ey...')
   */
  async verify(accessToken: string): Promise<Token> {
    await this.request.get(`${this.config.prefix}/realms/${this.config.realm}/protocol/openid-connect/userinfo`, {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    });

    return new Token(accessToken);
  }
}
