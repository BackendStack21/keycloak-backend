import { decode } from 'jsonwebtoken'

export interface TokenContent {
    [key: string]: any,

    /**
     * Authorization server’s identifier
     */
    iss: string,

    /**
     * User’s identifier
     */
    sub: string,

    /**
     * Client’s identifier
     */
    aud: string | string[],

    /**
     * Expiration time of the ID token
     */
    exp: number,

    /**
     * Time at which JWT was issued
     */
    iat: number,

    family_name?: string,
    given_name?: string,
    name?: string,
    email?: string,
    preferred_username?: string,
    email_verified?: boolean,


}

export class Token {
    public readonly token: string
    public readonly content: TokenContent

    constructor(token: string) {
        this.token = token
        const jwtPayload = decode(this.token, {json: true});
        if (
            jwtPayload !== null &&
            jwtPayload.iss !== undefined &&
            jwtPayload.sub !== undefined &&
            jwtPayload.aud !== undefined &&
            jwtPayload.exp !== undefined &&
            jwtPayload.iat !== undefined
        ) {
            this.content = {
                ...jwtPayload,
                iss: jwtPayload.iss,
                sub: jwtPayload.sub,
                aud: jwtPayload.aud,
                exp: jwtPayload.exp,
                iat: jwtPayload.iat,
            }
        } else {
            throw new Error('Invalid token');
        }
    }

    isExpired(): boolean {
        return (this.content.exp * 1000) <= Date.now()
    }

    hasApplicationRole(appName: string, roleName: string): boolean {
        const appRoles = this.content.resource_access[appName]
        if (appRoles == null) {
            return false
        }

        return (appRoles.roles.indexOf(roleName) >= 0)
    }

    hasRealmRole(roleName: string): boolean {
        return (this.content.realm_access.roles.indexOf(roleName) >= 0)
    }
}
