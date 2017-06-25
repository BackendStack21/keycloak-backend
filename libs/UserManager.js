class UserManager {
    constructor(config, request, token) {
        this.config = config;
        this.request = request;
        this.token = token;
    }

    async details(id) {
        let response = await this.request.get(`/auth/admin/realms/${this.config.realm}/users/${id}`, {
            headers: {
                'Authorization': 'Bearer ' + await this.token.get()
            }
        });

        return response.data;
    }

    async roles(id, clients) {
        let promises = [];
        clients = clients || this.config.clients || [];
        let accessToken = await this.token.get();

        // retrieve roles from each target client
        clients.forEach(async cid => promises.push(this.request
            .get(`/auth/admin/realms/${this.config.realm}/users/${id}/role-mappings/clients/${cid}/composite`, {
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                }
            })));
        // retrieve roles from realm
        promises.push(this.request
            .get(`/auth/admin/realms/${this.config.realm}/users/${id}/role-mappings/realm/composite`, {
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                }
            }));

        return (await Promise.all(promises))
            .map((response) => response.data.map((role => role.name)))
            .reduce((arr, names) => {
                arr.push(...names);
                return arr;
            }, []);
    }
}

module.exports = UserManager;