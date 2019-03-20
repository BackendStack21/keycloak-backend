const qs = require('querystring')

class AccessToken {
  constructor (cfg, request) {
    this.config = cfg
    this.request = request
  }

  async info (accessToken) {
    let response = await this.request.get(`/auth/realms/${this.config.realm}/protocol/openid-connect/userinfo`, {
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    })

    return response.data
  }

  refresh (refreshToken) {
    let cfg = this.config

    return this.request.post(`/auth/realms/${cfg.realm}/protocol/openid-connect/token`, qs.stringify({
      grant_type: 'refresh_token',
      client_id: cfg.client_id,
      client_secret: cfg.client_secret,
      refresh_token: refreshToken
    }))
  }

  async get () {
    let cfg = this.config

    if (!this.data) {
      let response = await this.request.post(`/auth/realms/${cfg.realm}/protocol/openid-connect/token`, qs.stringify({
        grant_type: 'password',
        username: cfg.username,
        password: cfg.password,
        client_id: cfg.client_id,
        client_secret: cfg.client_secret
      }))
      this.data = response.data

      return this.data.access_token
    } else {
      try {
        await this.info(this.data.access_token)

        return this.data.access_token
      } catch (err) {
        try {
          let response = await this.refresh(this.data.refresh_token)
          this.data = response.data

          return this.data.access_token
        } catch (err) {
          delete this.data

          return this.get()
        }
      }
    }
  }
}

module.exports = AccessToken
