const config = require('./config-example');
const keycloak = require('./index')(config);

(async() => {
    try {
        //setInterval(async() => {
        let start = new Date().getTime();
        let info = await keycloak.accessToken.info(await keycloak.accessToken.get());
        let [details, roles] = await Promise.all([
            keycloak.users.details(info.sub),
            keycloak.users.roles(info.sub)
        ]);

        console.log(new Date().getTime() - start);
        console.log(info);
        console.log(details);
        console.log(roles);
        //}, 1000);

    } catch (err) {
        console.log(err.response.status);
        console.log(err.response.statusText);
        console.log(err.response.data);
    }
})();