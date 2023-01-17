const config = require('../local/config-example')
const Keycloak = require('../dist').default
const fs = require('fs');

const keycloak = new Keycloak(config);

(async () => {
  try {
    // current version of Keycloak requires the openid scope for accessing user info endpoint
    const someAccessToken = await keycloak.accessToken.get('openid')
    // how to get openid info from access token...
    // info.sub contains the user id
    const info = await keycloak.accessToken.info(someAccessToken)
    console.log(info)

    // verify token online, intended for micro-service authorization
    let token = await keycloak.jwt.verify(someAccessToken)
    console.log(token.isExpired())
    console.log(token.hasRealmRole('user'))
    console.log(token.hasApplicationRole('nodejs-connect', 'vlm-readonly'))

    // verify token offline, intended for micro-service authorization
    // using this method does not consider token invalidation, avoid long-term tokens here
    const cert = fs.readFileSync('./local/public_cert.pem')
    token = await keycloak.jwt.verifyOffline(someAccessToken, cert)
    console.log(token.isExpired())
    // console.log(token.hasRealmRole('user'))
    // console.log(token.hasApplicationRole('nodejs-connect', 'vlm-readonly'))

    // how to manually refresh custom access token
    // (this operation is performed automatically for the service access token)
    const response = await keycloak.accessToken.refresh(keycloak.accessToken.data.refresh_token)
    console.log(response.data)
  } catch (err) {
    console.log(err)
  }
})()
