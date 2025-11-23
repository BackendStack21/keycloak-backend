import Axios from "axios";
import { AccessToken } from "./AccessToken";
import { Jwt } from "./Jwt";

/**
 * External configuration options accepted by the Keycloak client.
 * Users may pass only the fields from this interface; internals will
 * extend to `IInternalConfig` and shape additional fields at runtime.
 */
export interface IExternalConfig {
  realm: string;
  keycloak_base_url: string;
  client_id: string;
  username?: string;
  password?: string;
  client_secret?: string;
  is_legacy_endpoint?: boolean;
  timeout?: number;
  httpsAgent?: any;
  onError?: (error: Error, context: string) => void;
}

export interface IInternalConfig extends IExternalConfig {
  prefix: string;
}

/**
 * Main Keycloak entrypoint. Instantiates the HTTP client and exposes
 * helper instances for token lifecycle management (`AccessToken`) and
 * JWT verification (`Jwt`).
 */
export class Keycloak {
  public readonly jwt: Jwt;
  public readonly accessToken: AccessToken;

  /**
   * Construct a new Keycloak client instance.
   *
   * The instance provides `accessToken` and `jwt` helpers for programmatic
   * token management and verification. This class does not perform network
   * calls on construction.
   *
   * @param cfg - External configuration for Keycloak endpoints and credentials
   * @example
   * const keycloak = new Keycloak({
   *   realm: 'my-realm',
   *   keycloak_base_url: 'https://keycloak.example.org',
   *   client_id: 'my-client',
   *   client_secret: 'super-secret'
   * })
   * const token = await keycloak.accessToken.get()
   */
  constructor(cfg: IExternalConfig) {
    // Build internal config from provided external config and compute
    // a `prefix` used to support legacy Keycloak endpoints.
    const icfg: IInternalConfig = {
      ...cfg,
      prefix: "",
    };
    // Create an Axios HTTP client with sensible defaults. The `timeout`
    // is set to a defensive default of 10s, but can be overridden by the
    // user via `cfg.timeout`. An optional custom `httpsAgent` is also
    // supported for environments requiring custom TLS behavior.
    const client = Axios.create({
      baseURL: icfg.keycloak_base_url,
      timeout: icfg.timeout ?? 10000,
      httpsAgent: icfg.httpsAgent,
    });

    // When integration with Keycloak < 18 is required, a leading `/auth`
    // prefix must be used for realm endpoint paths. This conditionally
    // computes the correct `prefix` for all downstream client calls.
    if (icfg.is_legacy_endpoint === true) {
      icfg.prefix = "/auth";
    }
    // Instantiate helper services with the configured HTTP client.
    this.accessToken = new AccessToken(icfg, client);
    this.jwt = new Jwt(icfg, client);
  }
}
