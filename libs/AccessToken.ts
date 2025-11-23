import { stringify } from "querystring";
import { IInternalConfig } from "./index";
import { AxiosInstance } from "axios";

/** Parameters shared by token request methods. */
interface ICommonRequestOptions {
  grant_type: string;
  client_id: string;
  client_secret?: string;
}

/** Options object for token request used by `get()` (and tests). */
interface IGetOptions extends ICommonRequestOptions {
  username?: string;
  password?: string;
  scope?: string;
}

/** Options for refresh token request. */
interface IRefreshOptions extends ICommonRequestOptions {
  refresh_token: string;
}

/**
 * AccessToken provides a simple stateful wrapper for a Keycloak
 * client credentials or resource owner password credentials grant token,
 * with an auto-refresh capability and safety limits to avoid infinite
 * recursion during authentication retries.
 */
export class AccessToken {
  // Cached token data from Keycloak. Null means 'no token available'
  private data: any;
  // Maximum number of retries to prevent infinite recursion during refresh
  private readonly maxRetries: number = 3;

  constructor(private readonly config: IInternalConfig, private readonly client: AxiosInstance) {}

  // Helper to push errors to the optional `onError` hook provided by
  // callers. This centralizes error logging and allows production users
  // to capture security-relevant events if desired.
  private logError(error: Error, context: string): void {
    if (this.config.onError != null) {
      this.config.onError(error, context);
    }
  }

  /**
   * Retrieve Keycloak userinfo for the provided access token.
   *
   * This method performs a GET on the Keycloak `/userinfo` endpoint and
   * returns the parsed JSON body. If the call fails (network or HTTP
   * error), the underlying Axios error will be propagated.
   *
   * @param accessToken - The raw access token string
   * @returns Resolves with the Keycloak userinfo object as returned by `/userinfo`
   * @throws {AxiosError} When the request fails; synchronously re-thrown
   * @example
   * const info = await accessToken.info('ey...')
   */
  async info(accessToken: string): Promise<any> {
    const endpoint = `${this.config.prefix}/realms/${this.config.realm}/protocol/openid-connect/userinfo`;
    const response = await this.client.get(endpoint, {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    });

    return response.data;
  }

  /**
   * Exchange a refresh token for a new access token / refresh token pair.
   *
   * This method uses Keycloak's `refresh_token` grant type. On success
   * the full Axios response is returned and the caller can read
   * `response.data` for the `access_token` value.
   *
   * @param refreshToken - Refresh token string from a previously issued token pair
   * @returns Resolves with the Axios response containing `data` with the refreshed token pair
   * @throws {AxiosError} When the request fails (e.g., refresh token expired)
   * @example
   * const resp = await accessToken.refresh('refresh-token')
   * // resp.data.access_token -> 'new-token'
   */
  async refresh(refreshToken: string): Promise<any> {
    const options: IRefreshOptions = {
      grant_type: "refresh_token",
      client_id: this.config.client_id,
      refresh_token: refreshToken,
    };
    if (this.config.client_secret != null) {
      options.client_secret = this.config.client_secret;
    }

    const endpoint = `${this.config.prefix}/realms/${this.config.realm}/protocol/openid-connect/token`;
    return await this.client.post(endpoint, stringify({ ...options }));
  }

  /**
   * Returns a valid access token; if a token is cached it'll be validated
   * via `userinfo`, otherwise a new token request is performed.
   *
   * Logic summary:
   *  - If `this.data` is null: perform a token request. The default
   *    grant is `client_credentials`; when `username` and `password` are
   *    configured the `password` grant is used instead.
   *  - If the token is present: validate it by calling Keycloak's
   *    `/userinfo`. If validation fails and a `refresh_token` exists,
   *    attempt to refresh. If refresh fails or no refresh token exists,
   *    re-authenticate (with capped retries).
   *
   * @param scope - Optional OIDC scope to request (defaults to `openid`)
   * @param depth - Internal retry depth (used to prevent recursion)
   * @returns A Promise resolving to the access token string
   * @throws {Error} `Max authentication retry depth exceeded` when too many retries
   * @throws {AxiosError} When token requests, `userinfo` calls or refresh fail
   * @example
   * const token = await accessToken.get() // default `openid` scope
   * const userToken = await accessToken.get('openid profile')
   */
  async get(scope?: string, depth: number = 0): Promise<string> {
    // Prevent infinite recursion when repeated attempts fail; report to
    // monitoring hook and raise an error to the caller.
    if (depth >= this.maxRetries) {
      const error = new Error("Max authentication retry depth exceeded");
      this.logError(error, "AccessToken.get");
      throw error;
    }

    // No cached token; request a new one. By default use the
    // `client_credentials` grant - it is preferred for service-to-service
    // flows. If the runtime configuration contains `username`/`password`,
    // switch to `password` grant to support resource-owner flows.
    if (this.data == null) {
      const options: IGetOptions = {
        grant_type: "client_credentials",
        client_id: this.config.client_id,
      };

      if (this.config.username != null && this.config.password != null) {
        options.grant_type = "password";
        options.username = this.config.username;
        options.password = this.config.password;
      }

      // Attach a client secret when available; certain Keycloak clients
      // require it for the client credentials flow.
      if (this.config.client_secret != null) {
        options.client_secret = this.config.client_secret;
      }

      // Default scope to `openid` for Keycloak's userinfo endpoint and
      // token policies; allow overriding by callers.
      options.scope = scope ?? "openid";

      const endpoint = `${this.config.prefix}/realms/${this.config.realm}/protocol/openid-connect/token`;
      try {
        const response = await this.client.post(endpoint, stringify({ ...options }));
        this.data = response.data;

        return this.data.access_token;
      } catch (err) {
        this.logError(err instanceof Error ? err : new Error(String(err)), "AccessToken.get:request");
        throw err;
      }
    } else {
      try {
        // Validate the token via `userinfo` endpoint. If validation
        // succeeds the token is still valid; otherwise a refresh may be
        // attempted or a full re-authentication will be performed.
        await this.info(this.data.access_token);

        return this.data.access_token;
      } catch (err) {
        this.logError(err instanceof Error ? err : new Error(String(err)), "AccessToken.get:info");
        try {
          // Try to refresh using a refresh token if we have one.
          if (this.data.refresh_token == null) {
            throw new Error("No refresh token available");
          }
          const response = await this.refresh(this.data.refresh_token);
          this.data = response.data;

          return this.data.access_token;
        } catch (err) {
          // If refresh fails, clear cached data and attempt a full
          // re-authentication (with a capped retry depth).
          this.logError(err instanceof Error ? err : new Error(String(err)), "AccessToken.get:refresh");
          delete this.data;

          return await this.get(scope, depth + 1);
        }
      }
    }
  }
}
