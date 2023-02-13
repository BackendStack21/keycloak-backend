import Axios from 'axios'
import { AccessToken } from './AccessToken'
import { Jwt } from './Jwt'

export interface IExternalConfig {
  realm: string
  keycloak_base_url: string
  client_id: string
  username?: string
  password?: string
  client_secret?: string
  is_legacy_endpoint?: boolean
}

export interface IInternalConfig extends IExternalConfig {
  prefix: string
}

export class Keycloak {
  public readonly jwt: Jwt
  public readonly accessToken: AccessToken

  constructor (cfg: IExternalConfig) {
    const icfg: IInternalConfig = {
      ...cfg,
      prefix: ''
    }
    const client = Axios.create({
      baseURL: icfg.keycloak_base_url
    })

    if (icfg.is_legacy_endpoint == true) {
      icfg.prefix = '/auth'
    }
    
    this.accessToken = new AccessToken(icfg, client)
    this.jwt = new Jwt(icfg, client)
  }
}
