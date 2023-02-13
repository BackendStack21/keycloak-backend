import { stringify } from 'querystring'
import { IInternalConfig } from './index'
import { AxiosInstance } from 'axios'

interface ICommonRequestOptions {
  grant_type: string
  client_id: string
  client_secret?: string
}

interface IGetOptions extends ICommonRequestOptions {
  username?: string
  password?: string
  scope?: string
}

interface IRefreshOptions extends ICommonRequestOptions {
  refresh_token: string
}

export class AccessToken {
  private data: any

  constructor (private readonly config: IInternalConfig, private readonly client: AxiosInstance) {
  }

  async info (accessToken: string): Promise<any> {
    const endpoint = `${this.config.prefix}/realms/${this.config.realm}/protocol/openid-connect/userinfo`
    const response = await this.client.get(endpoint, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    })

    return response.data
  }

  async refresh (refreshToken: string): Promise<any> {
    const options: IRefreshOptions = {
      grant_type: 'refresh_token',
      client_id: this.config.client_id,
      refresh_token: refreshToken
    }
    if (this.config.client_secret != null) {
      options.client_secret = this.config.client_secret
    }

    const endpoint = `${this.config.prefix}/realms/${this.config.realm}/protocol/openid-connect/token`
    return await this.client.post(endpoint, stringify({ ...options }))
  }

  async get (scope?: string): Promise<string> {
    if (this.data == null) {
      const options: IGetOptions = {
        grant_type: 'password',
        username: this.config.username,
        password: this.config.password,
        client_id: this.config.client_id
      }
      if (this.config.client_secret != null) {
        options.client_secret = this.config.client_secret
      }
      if (scope != null) {
        options.scope = scope
      }

      const endpoint = `${this.config.prefix}/realms/${this.config.realm}/protocol/openid-connect/token`
      const response = await this.client.post(endpoint, stringify({ ...options }))
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

          return await this.get(scope)
        }
      }
    }
  }
}
