const Axios = require('axios').default
const AccessToken = require('./AccessToken')
const Jwt = require('./Jwt')

module.exports = (cfg) => {
  const client = Axios.create({
    baseURL: cfg.keycloak_base_url
  })

  if (cfg.is_legacy_endpoint) {
    cfg.prefix = '/auth'
  } else {
    cfg.prefix = ''
  }

  const accessToken = new AccessToken(cfg, client)
  const jwt = new Jwt(cfg, client)

  return {
    jwt,
    accessToken
  }
}
