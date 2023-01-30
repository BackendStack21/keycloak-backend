const config = require('../local/config-example')
const Keycloak = require('../dist').Keycloak
const keycloak = new Keycloak(config)

keycloak.accessToken.get().then(async (accessToken) => {
  const token = keycloak.jwt.decode(accessToken)
  console.log({ expired: token.isExpired() })
  console.log({ content: token.content })
  console.log({ hasRole: token.hasApplicationRole('client-name', 'ROLE_NAME') })
})
