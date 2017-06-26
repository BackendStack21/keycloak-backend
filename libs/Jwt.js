const axios = require('axios');
const Token = require('./Token');

class Jwt {
    constructor(config, request) {
        this.config = config;
        this.request = request;
    }

    async verify(accessToken) {
        await this.request.get(`/auth/realms/${this.config.realm}/protocol/openid-connect/userinfo`, {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });

        return new Token(accessToken);
    }
}

module.exports = Jwt;