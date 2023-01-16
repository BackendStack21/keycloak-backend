const config = require('../local/config-example')
const keycloak = require('../dist')(config)

keycloak.accessToken.get('openid').then(async (accessToken) => {
  const token = await keycloak.jwt.verify(accessToken)
  console.log(token.isExpired())
})
