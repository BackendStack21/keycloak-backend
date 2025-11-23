# Integration Tests

This directory contains end-to-end integration tests that validate the keycloak-backend library against a real Keycloak instance running in Docker.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- npm or yarn

## Quick Start

Run integration tests with a single command:

```bash
npm run test:integration
```

This will:

1. Start Keycloak and PostgreSQL using Docker Compose
2. Wait for Keycloak to be fully ready
3. Run the integration test suite
4. Clean up containers after tests complete

## Manual Testing

If you want more control over the test environment:

### 1. Start Keycloak

```bash
npm run integration:up
```

This starts:

- PostgreSQL database on port 5432
- Keycloak on port 8080
- Pre-configured test realm, client, and users

### 2. Wait for Keycloak to be Ready

```bash
npm run integration:wait
```

This polls the Keycloak health endpoint until it's ready (up to 2 minutes).

### 3. Run Integration Tests

```bash
npm run integration:test
```

### 4. View Logs (Optional)

```bash
npm run integration:logs
```

### 5. Stop and Clean Up

```bash
npm run integration:down
```

To remove all data including volumes:

```bash
npm run integration:clean
```

## Test Configuration

The integration tests use the following configuration:

- **Keycloak URL**: `http://localhost:8080`
- **Realm**: `test-realm`
- **Client ID**: `test-client`
- **Client Secret**: `test-secret`
- **Test Users**:
  - `testuser` / `testpass` (regular user with `user` role)
  - `admin` / `adminpass` (admin user with `admin` and `user` roles)

### Accessing Keycloak Admin Console

While tests are running, you can access the Keycloak admin console:

- URL: http://localhost:8080
- Username: `admin`
- Password: `admin`

## Test Coverage

The integration tests cover:

- ✅ **Token Generation**
  - Client credentials grant
  - Password grant (resource owner)
  - Token caching and reuse
- ✅ **Token Verification**
  - Online verification (via Keycloak API)
  - Offline verification (using public certificate)
  - Token decoding without verification
- ✅ **User Information**
  - Retrieving user info from access token
- ✅ **Role Management**
  - Realm role verification
  - Application/client role verification
- ✅ **Token Lifecycle**
  - Token expiry detection
  - Token refresh
- ✅ **Error Handling**
  - Invalid credentials
  - Invalid client secret
  - Invalid realm
  - Network timeouts
- ✅ **Security Features**
  - Custom timeout configuration
  - Error callback handling
- ✅ **Scope Management**
  - Custom scope requests
  - Offline access scope

## Troubleshooting

### Keycloak not starting

If Keycloak fails to start, check:

1. Ports 8080 and 5432 are not already in use:

   ```bash
   lsof -i :8080
   lsof -i :5432
   ```

2. Docker has enough resources (at least 2GB RAM recommended)

3. View container logs:
   ```bash
   npm run integration:logs
   ```

### Tests failing

If tests fail:

1. Ensure Keycloak is fully ready:

   ```bash
   npm run integration:wait
   ```

2. Check Keycloak logs for errors:

   ```bash
   docker compose logs keycloak
   ```

3. Verify realm configuration was imported:
   - Visit http://localhost:8080
   - Login as admin/admin
   - Check if `test-realm` exists

### Clean slate

To start fresh:

```bash
npm run integration:clean
npm run test:integration
```

## CI/CD Integration

For CI/CD pipelines, use the all-in-one command:

```bash
npm run test:integration
```

Example GitHub Actions workflow:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
```

## Architecture

### Docker Compose Stack

```
┌─────────────────┐
│   PostgreSQL    │  Port 5432
│   (Database)    │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│    Keycloak     │  Port 8080
│   (Auth Server) │  - Admin: admin/admin
└────────┬────────┘  - Health: /health/ready
         │
         │
┌────────▼────────┐
│  Test Suite     │
│  (Jest + TS)    │
└─────────────────┘
```

### Realm Configuration

The realm is pre-configured via `realm-export.json`:

- Realm: `test-realm`
- Client: `test-client` (confidential)
- Users: `testuser`, `admin`
- Roles: `user`, `admin`, `client-user-role`, `client-admin-role`

## Performance

Typical test execution times:

- Container startup: 30-60 seconds
- Test suite execution: 30-45 seconds
- **Total**: ~1-2 minutes

## Security Notes

⚠️ **Important**: This setup is for **testing only**. Never use these configurations in production:

- Default admin credentials (admin/admin)
- Weak client secrets
- HTTP instead of HTTPS
- Permissive CORS settings
- Development mode (`start-dev`)
