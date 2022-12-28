const qs = require('querystring')

class AccessToken {
  constructor (cfg, client) {
    this.config = cfg
    this.client = client
  }

  async info (accessToken) {
    const cfg = this.config

    const endpoint = `${cfg.prefix}/realms/${cfg.realm}/protocol/openid-connect/userinfo`
    const response = await this.client.get(endpoint, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    })

    return response.data
  }

  refresh (refreshToken) {
    const cfg = this.config

    const options = {
      grant_type: 'refresh_token',
      client_id: cfg.client_id,
      refresh_token: refreshToken
    }
    if (cfg.client_secret) {
      options.client_secret = cfg.client_secret
    }

    const endpoint = `${cfg.prefix}/realms/${cfg.realm}/protocol/openid-connect/token`
    return this.client.post(endpoint, qs.stringify(options))
  }

  async get (scope) {
    const cfg = this.config

    if (!this.data) {
      const options = {
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
      const response = await this.client.post(endpoint, qs.stringify(options))
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

module.exports = AccessToken
