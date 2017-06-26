const config = require('./config-example');
const keycloak = require('./../index')(config);
const fs = require('fs');

(async() => {
    try {
        let someAccessToken = await keycloak.accessToken.get();
        // how to get openid info from access token...
        // info.sub contains the user id
        let info = await keycloak.accessToken.info(someAccessToken);

        // verify token online, intended for micro-service authorization
        let token = await keycloak.jwt.verify(someAccessToken);
        //console.log(token.isExpired());
        //console.log(token.hasRealmRole('user'));
        //console.log(token.hasApplicationRole('nodejs-connect', 'vlm-readonly'));

        // verify token offline, intended for micro-service authorization
        // using this method does not consider token invalidation, avoid long-term tokens here
        let cert = fs.readFileSync('public_cert.pem');
        token = await keycloak.jwt.verifyOffline(someAccessToken, cert);
        //console.log(token.isExpired());
        //console.log(token.hasRealmRole('user'));
        //console.log(token.hasApplicationRole('nodejs-connect', 'vlm-readonly'));

        // how to manually refresh custom access token 
        // (this operation is performed automatically for the service access token)
        let newAccessToken = await keycloak.accessToken.refresh(someAccessToken);

        // how to get user details given the user id
        let [details, roles] = await Promise.all([
            keycloak.users.details(info.sub),
            keycloak.users.roles(info.sub)
        ]);
    } catch (err) {
        console.log(err);
        console.log(err.response.status);
        console.log(err.response.statusText);
        console.log(err.response.data);
    }
})();