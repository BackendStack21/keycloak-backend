/**
 * Inspired from source: http://www.keycloak.org/keycloak-nodejs-auth-utils/token.js.html
 */
function Token (token) {
  this.token = token

  const parts = token.split('.')
  this.header = JSON.parse(Buffer.from((parts[0], 'base64').toString()))
  this.content = JSON.parse(Buffer.from((parts[1], 'base64').toString()))
  this.signature = Buffer.from(parts[2], 'base64')
  this.signed = parts[0] + '.' + parts[1]
}

Token.prototype.isExpired = function () {
  if ((this.content.exp * 1000) > Date.now()) {
    return false
  }
  return true
}

Token.prototype.hasApplicationRole = function (appName, roleName) {
  const appRoles = this.content.resource_access[appName]

  if (!appRoles) {
    return false
  }

  return (appRoles.roles.indexOf(roleName) >= 0)
}

Token.prototype.hasRealmRole = function (roleName) {
  return (this.content.realm_access.roles.indexOf(roleName) >= 0)
}

module.exports = Token
