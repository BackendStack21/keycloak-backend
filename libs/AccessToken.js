const qs = require('querystring');

class AccessToken {
    constructor(config, request, users) {
        this.config = config;
        this.request = request;
        this.users = users;

        users.setServiceToken(this);
    }

    async refresh(refreshToken, config) {
        config = config || this.config;

        return this.request.post(`/auth/realms/${config.realm}/protocol/openid-connect/token`, qs.stringify({
            grant_type: 'refresh_token',
            client_id: config.client_id,
            client_secret: config.client_secret,
            refresh_token: refreshToken
        }));
    }

    async get(config = {}) {
        config = Object.assign(this.config, config);

        if (!this.data) {
            let response = await this.request.post(`/auth/realms/${config.realm}/protocol/openid-connect/token`, qs.stringify({
                grant_type: 'password',
                username: config.username,
                password: config.password,
                client_id: config.client_id,
                client_secret: config.client_secret
            }));
            this.data = response.data;

            return this.data.access_token;
        } else {
            try {
                await this.users.info(this.data.access_token);

                return this.data.access_token;
            } catch (err) {
                try {
                    let response = await this.refresh(this.data.refresh_token, config);
                    this.data = response.data;

                    return this.data.access_token;
                } catch (err) {
                    delete this.data;

                    return this.get(config);
                }
            }
        }
    }
}

module.exports = AccessToken;