const config = require('../local/config-example')
const keycloak = require('../libs/index')(config)
const fs = require('fs')

const cert = fs.readFileSync('./local/public_cert.pem')

keycloak.accessToken.get().then(async (accessToken) => {
  const token = await keycloak.jwt.verifyOffline(accessToken, cert)
  console.log(token.isExpired())
})
