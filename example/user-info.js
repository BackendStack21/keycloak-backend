const config = require('../local/config-example')
const keycloak = require('../libs/index')(config)

keycloak.accessToken.get('openid').then(async (accessToken) => {
  const info = await keycloak.accessToken.info(accessToken)
  console.log(info)
})
