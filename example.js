const config = require('./config-example');
const kc = require('./index')(config);

(async() => {
    try {
        setInterval(async() => {
            let start = new Date().getTime();
            let info = await kc.users.info(await kc.accessToken.get());
            let [details, roles] = await Promise.all([
                kc.users.details(info.sub),
                kc.users.roles(info.sub)
            ]);

            console.log(new Date().getTime() - start);
            console.log(info);
            console.log(details);
            console.log(roles);
        }, 1000);

    } catch (err) {
        console.log(err);
    }
})();