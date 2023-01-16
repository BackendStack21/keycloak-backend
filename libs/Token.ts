import decode from "jwt-decode"

export default class Token {
  private readonly token: string;
  private readonly content: any;
  constructor (token: string) {
    this.token = token
    this.content = decode(this.token)
  }

  isExpired (): boolean {
    return (this.content.exp * 1000) <= Date.now();
  }

  hasApplicationRole (appName: string, roleName: string): boolean {
    const appRoles = this.content.resource_access[appName]

    if (!appRoles) {
      return false
    }

    return (appRoles.roles.indexOf(roleName) >= 0)
  }

  hasRealmRole (roleName: string): boolean {
    return (this.content.realm_access.roles.indexOf(roleName) >= 0)
  }
}
