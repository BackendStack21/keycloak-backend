const Axios = require('axios');
const UserManager = require('./UserManager');
const AccessToken = require('./AccessToken');
const Jwt = require('./Jwt');

module.exports = (cfg) => {
    const request = Axios.create({
        baseURL: cfg['auth-server-url']
    });

    const accessToken = new AccessToken(cfg, request);
    const users = new UserManager(cfg, request, accessToken);
    const jwt = new Jwt(cfg, request);

    return {
        jwt,
        users,
        accessToken
    };
}