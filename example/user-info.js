const config = require('../local/config-example')
const Keycloak = require('../dist').default

const keycloak = new Keycloak(config)

keycloak.accessToken.get('openid').then(async (accessToken) => {
  const info = await keycloak.accessToken.info(accessToken)
  console.log(info)
})
