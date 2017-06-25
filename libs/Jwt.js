const axios = require('axios');
const Token = require('./Token');

module.exports = {
    verify: async(accessToken) => {
        let token = new Token(accessToken);
        await axios.get(token.content.iss + '/protocol/openid-connect/userinfo', {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });

        return token;
    }
}