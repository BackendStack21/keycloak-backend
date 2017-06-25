const config = require('./config-example');
const keycloak = require('./index')(config);

(async() => {
    try {
        // how to get openid info from access token...
        // info.sub contains the user id
        let info = await keycloak.accessToken.info(await keycloak.accessToken.get());

        // how to manually refresh custom access token 
        // (this operation is performed automatically for the service access token)
        let newAccessToken = await keycloak.accessToken.refresh(await keycloak.accessToken.get());

        // how to get user details given the user id
        let [details, roles] = await Promise.all([
            keycloak.users.details(info.sub),
            keycloak.users.roles(info.sub)
        ]);

        console.log(info);
        console.log(details);
        console.log(roles);
    } catch (err) {
        console.log(err.response.status);
        console.log(err.response.statusText);
        console.log(err.response.data);
    }
})();