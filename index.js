const Axios = require('axios');
const UserManager = require('./libs/UserManager');
const AccessToken = require('./libs/AccessToken');

module.exports = (cfg) => {
    const request = Axios.create({
        baseURL: cfg['auth-server-url']
    });

    const accessToken = new AccessToken(cfg, request);
    const users = new UserManager(cfg, request, accessToken);
    return {
        users,
        accessToken
    };
}