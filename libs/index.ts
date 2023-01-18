import Axios from "axios";
import AccessToken from './AccessToken'
import Jwt from "./Jwt"

export interface externalConfigI {
  realm: string,
  keycloak_base_url: string,
  client_id: string,
  username?: string,
  password?: string,
  client_secret?: string,
  is_legacy_endpoint?: boolean;
}

export interface internalConfigI extends externalConfigI {
  prefix: string,
}

export default class Keycloak {
  public readonly jwt: Jwt;
  public readonly accessToken: AccessToken;

  constructor(cfg: externalConfigI) {
    const icfg: internalConfigI = {
      ...cfg,
      prefix: ''
    }
    const client = Axios.create({
      baseURL: icfg.keycloak_base_url
    })

    if (icfg.is_legacy_endpoint) {
      icfg.prefix = '/auth'
    }

    this.accessToken = new AccessToken(icfg, client)
    this.jwt = new Jwt(icfg, client)
  }
};
