import {stringify} from 'querystring'
import {internalConfigI} from "./index";
import {AxiosInstance} from "axios";

export default class AccessToken {
  private readonly config: internalConfigI;
  private readonly client: AxiosInstance;

  private data: any;
  constructor (cfg: internalConfigI, client: AxiosInstance) {
    this.config = cfg
    this.client = client
  }

  async info (accessToken: string) {
    const cfg = this.config

    const endpoint = `${cfg.prefix}/realms/${cfg.realm}/protocol/openid-connect/userinfo`
    const response = await this.client.get(endpoint, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    })

    return response.data
  }

  refresh (refreshToken: string) {
    const cfg = this.config

    type refreshOptions = {
      grant_type: string,
      client_id: string,
      refresh_token: string,
      client_secret?: string
    }

    const options: refreshOptions = {
      grant_type: 'refresh_token',
      client_id: cfg.client_id,
      refresh_token: refreshToken,
    }
    if (cfg.client_secret) {
      options.client_secret = cfg.client_secret
    }

    const endpoint = `${cfg.prefix}/realms/${cfg.realm}/protocol/openid-connect/token`
    return this.client.post(endpoint, stringify(options))
  }

  async get (scope?: string): Promise<string> {
    const cfg = this.config

    if (!this.data) {
      type getOptions = {
        grant_type: string,
        username?: string,
        password?: string,
        client_id: string,
        client_secret?: string,
        scope?: string
      }

      const options: getOptions = {
        grant_type: 'password',
        username: cfg.username,
        password: cfg.password,
        client_id: cfg.client_id
      }
      if (cfg.client_secret) {
        options.client_secret = cfg.client_secret
      }
      if (scope) {
        options.scope = scope
      }

      const endpoint = `${cfg.prefix}/realms/${cfg.realm}/protocol/openid-connect/token`
      const response = await this.client.post(endpoint, stringify(options))
      this.data = response.data

      return this.data.access_token
    } else {
      try {
        await this.info(this.data.access_token)

        return this.data.access_token
      } catch (err) {
        try {
          const response = await this.refresh(this.data.refresh_token)
          this.data = response.data

          return this.data.access_token
        } catch (err) {
          delete this.data

          return this.get(scope)
        }
      }
    }
  }
}
