const Axios = require('axios');
const UserManager = require('./libs/UserManager');
const AccessToken = require('./libs/AccessToken');
const Jwt = require('./libs/Jwt');

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