const config = require('../local/config-example')
const keycloak = require('../libs/index')(config)

keycloak.accessToken.get().then(async (accessToken) => {
  // refresh operation is performed automatically on `keycloak.accessToken.get`
  const response = await keycloak.accessToken.refresh(keycloak.accessToken.data.refresh_token)
  console.log(response.data)
})
