# keycloak-backend
Keycloak Node.js minimalist connector for backend services integration. It aims to serve as base for high performance authorization middlewares.

> Note: Version 2.x uses `jsonwebtoken 8.x`

## Keycloak Introduction
The awesome open-source Identity and Access Management solution develop by RedHat.
Keycloak support those very nice features you are looking for:
- Single-Sign On
- LDAP and Active Directory
- Standard Protocols
- Social Login
- Clustering
- Custom Themes
- Centralized Management
- Identity Brokering
- Extensible
- Adapters
- High Performance
- Password Policies

More about Keycloak: http://www.keycloak.org/

## Using the keycloak-backend module
### Instantiating
```js
const keycloak = require('keycloak-backend')({
    "realm": "your realm name",
    "auth-server-url": "http://keycloak.dev:8080",
    "client_id": "your client name",
    "client_secret": "c88a2c21-9d1a-4f83-a18d-66d75c4d8020", // if required
    "username": "your service username",
    "password": "your service password"
});
```

### Validating access tokens
#### Online validation:
This method requires online connection to the Keycloak service to validate the access token. It is highly secure since it also check for the possible token invalidation. The disadvantage is that a request to the Keycloak service happens on every validation attempt.
```js
let token = await keycloak.jwt.verify(someAccessToken);
//console.log(token.isExpired());
//console.log(token.hasRealmRole('user'));
//console.log(token.hasApplicationRole('app-client-name', 'some-role'));
```

#### Offline validation:
This method perform offline JWT verification against the access token using the Keycloak Realm public key. Performance is higher compared to the online method, the disadvantage is that access token invalidation will not work until the token is expired.
```js
let cert = fs.readFileSync('public_cert.pem');
token = await keycloak.jwt.verifyOffline(someAccessToken, cert);
//console.log(token.isExpired());
//console.log(token.hasRealmRole('user'));
//console.log(token.hasApplicationRole('app-client-name', 'some-role'));
```

### Generating service access token
Efficiently maintaining a valid access token can be hard. Get it easy by using:
```js
let accessToken = await keycloak.accessToken.get()
```
Then:
```js
request.get('http://serviceb.com/v1/fetch/accounts', {
  'auth': {
    'bearer': await keycloak.accessToken.get()
  }
});
```
> For this feature, the authentication details described in the configuration options are used.

### Retrieve users information by id
Sometimes backend services only have a target user identifier to digg for details, in such cases, you can contact the Keycloak service by:

#### Retrieve user details by id
```js
let details = await keycloak.users.details(uid);
```

#### Retrieve user roles by id
```js
let details = await keycloak.users.roles(uid, [
    // clients id here for roles retrieval
  ], 
  true // include realm roles ?
);
```

## Tests
WIP
