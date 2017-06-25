const Axios = require('axios');
const UserManager = require('./libs/UserManager');
const AccessToken = require('./libs/AccessToken');

module.exports = (config) => {
    const request = Axios.create({
        baseURL: config['auth-server-url']
    });

    const users = new UserManager(config, request);
    const accessToken = new AccessToken(config, request, users);

    return {
        users,
        accessToken
    };
}