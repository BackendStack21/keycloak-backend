const config = require('../local/config-example')
const Keycloak = require('../dist').Keycloak
const keycloak = new Keycloak(config)
const fs = require('fs')

const cert = fs.readFileSync('./local/public_cert.pem')

keycloak.accessToken.get().then(async (accessToken) => {
  const token = await keycloak.jwt.verifyOffline(accessToken, cert)
  console.log(token.isExpired())
})
