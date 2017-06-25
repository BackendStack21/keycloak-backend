const Axios = require('axios');
const UserManager = require('./libs/UserManager');
const AccessToken = require('./libs/AccessToken');

module.exports = (cfg) => {
    const request = Axios.create({
        baseURL: cfg['auth-server-url']
    });
    const users = new UserManager(cfg, request);
    const accessToken = new AccessToken(cfg, request, users);

    return {
        users,
        accessToken
    };
}