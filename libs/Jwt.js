const jwt = require('jsonwebtoken');
const axios = require('axios');

module.exports = {
    verify: async(accessToken) => {
        let decoded = jwt.decode(accessToken);
        await axios.get(decoded.iss + '/protocol/openid-connect/userinfo', {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });

        return decoded;
    }
}