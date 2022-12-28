const decode = require('jwt-decode')

class Token {
  constructor (token) {
    this.token = token
    this.content = decode(this.token)
  }

  isExpired () {
    if ((this.content.exp * 1000) > Date.now()) {
      return false
    }
    return true
  }

  hasApplicationRole (appName, roleName) {
    const appRoles = this.content.resource_access[appName]

    if (!appRoles) {
      return false
    }

    return (appRoles.roles.indexOf(roleName) >= 0)
  }

  hasRealmRole (roleName) {
    return (this.content.realm_access.roles.indexOf(roleName) >= 0)
  }
}

module.exports = Token
