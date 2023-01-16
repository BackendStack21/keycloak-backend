import Token from "./Token";
import {verify, VerifyOptions} from "jsonwebtoken"
import {internalConfigI} from "./index";
import {AxiosInstance} from "axios";

export default class Jwt {
  private readonly config: internalConfigI;
  private request: AxiosInstance;
  constructor (config: internalConfigI, request: AxiosInstance) {
    this.config = config
    this.request = request
  }

  verifyOffline (accessToken: string, cert: any, options?: VerifyOptions) {
    return new Promise((resolve, reject) => {
      verify(accessToken, cert, options, (err, payload) => {
        if (err) reject(err)
        resolve(new Token(accessToken))
      })
    })
  }

  decode (accessToken: string): Token {
    return new Token(accessToken)
  }

  async verify (accessToken: string): Promise<Token> {
    const cfg = this.config

    await this.request.get(`${cfg.prefix}/realms/${this.config.realm}/protocol/openid-connect/userinfo`, {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    })

    return new Token(accessToken)
  }
}
