import { Keycloak } from "../../libs/Keycloak";
import { IExternalConfig } from "../../libs/Keycloak";
// Integration test configuration
const config: IExternalConfig = {
  realm: "test-realm",
  keycloak_base_url: process.env.KEYCLOAK_URL || "http://localhost:8080",
  client_id: "test-client",
  client_secret: "test-secret",
  username: "testuser",
  password: "testpass",
};

describe("Keycloak Integration Tests", () => {
  let keycloak: Keycloak;

  beforeAll(() => {
    // Initialize Keycloak instance for all tests
    keycloak = new Keycloak(config);
  });

  describe("AccessToken - Client Credentials Grant", () => {
    it("should generate access token using client credentials", async () => {
      const clientKeycloak = new Keycloak({
        ...config,
        username: undefined,
        password: undefined,
      });

      const accessToken = await clientKeycloak.accessToken.get();
      const token = clientKeycloak.jwt.decode(accessToken);

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe("string");
      expect(token.content).toBeDefined();
      expect(token.content.iss).toContain("test-realm");
      expect(token.content.azp).toBe("test-client");
      expect(token.isExpired()).toBe(false);
    }, 30000);

    it("should cache and reuse valid token", async () => {
      const clientKeycloak = new Keycloak({
        ...config,
        username: undefined,
        password: undefined,
      });

      const token1 = await clientKeycloak.accessToken.get();
      const token2 = await clientKeycloak.accessToken.get();

      expect(token1).toBe(token2);
    }, 30000);
  });

  describe("AccessToken - Password Grant", () => {
    it("should generate access token using password grant", async () => {
      const accessToken = await keycloak.accessToken.get();
      const token = keycloak.jwt.decode(accessToken);

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe("string");
      expect(token.content).toBeDefined();
      expect(token.content.iss).toContain("test-realm");
      expect(token.content.preferred_username).toBe("testuser");
      expect(token.isExpired()).toBe(false);
    }, 30000);

    it("should retrieve user information", async () => {
      const accessToken = await keycloak.accessToken.get();
      const userInfo = await keycloak.accessToken.info(accessToken);

      expect(userInfo).toBeDefined();
      expect(userInfo.preferred_username).toBe("testuser");
      expect(userInfo.email).toBe("testuser@example.com");
      expect(userInfo.given_name).toBe("Test");
      expect(userInfo.family_name).toBe("User");
    }, 30000);

    it("should handle token refresh", async () => {
      // Get initial token
      const accessToken1 = await keycloak.accessToken.get();
      const token1 = keycloak.jwt.decode(accessToken1);

      // Force token to be considered expired by manipulating the internal state
      // In real scenario, we would wait for expiration, but for testing we'll get a new instance
      const newKeycloak = new Keycloak(config);
      const accessToken2 = await newKeycloak.accessToken.get();
      const token2 = newKeycloak.jwt.decode(accessToken2);

      expect(accessToken1).toBeDefined();
      expect(accessToken2).toBeDefined();
      expect(token1.content.sub).toBe(token2.content.sub); // Same user
    }, 30000);
  });

  describe("Token Role Verification", () => {
    it("should verify realm roles", async () => {
      const accessToken = await keycloak.accessToken.get();
      const token = keycloak.jwt.decode(accessToken);

      expect(token.hasRealmRole("user")).toBe(true);
      expect(token.hasRealmRole("admin")).toBe(false);
      expect(token.hasRealmRole("nonexistent")).toBe(false);
    }, 30000);

    it("should verify application roles", async () => {
      const accessToken = await keycloak.accessToken.get();
      const token = keycloak.jwt.decode(accessToken);

      expect(token.hasApplicationRole("test-client", "client-user-role")).toBe(true);
      expect(token.hasApplicationRole("test-client", "client-admin-role")).toBe(false);
      expect(token.hasApplicationRole("test-client", "nonexistent")).toBe(false);
      expect(token.hasApplicationRole("other-client", "some-role")).toBe(false);
    }, 30000);

    it("should verify admin user roles", async () => {
      const adminKeycloak = new Keycloak({
        ...config,
        username: "admin",
        password: "adminpass",
      });

      const accessToken = await adminKeycloak.accessToken.get();
      const token = adminKeycloak.jwt.decode(accessToken);

      expect(token.hasRealmRole("admin")).toBe(true);
      expect(token.hasRealmRole("user")).toBe(true);
      expect(token.hasApplicationRole("test-client", "client-admin-role")).toBe(true);
      expect(token.hasApplicationRole("test-client", "client-user-role")).toBe(true);
    }, 30000);
  });

  describe("JWT Online Verification", () => {
    it("should verify valid token online", async () => {
      const accessToken = await keycloak.accessToken.get();

      const verified = await keycloak.jwt.verify(accessToken);

      expect(verified).toBeDefined();
      expect(verified.content.preferred_username).toBe("testuser");
    }, 30000);

    it("should decode token without verification", async () => {
      const accessToken = await keycloak.accessToken.get();

      const decoded = keycloak.jwt.decode(accessToken);

      expect(decoded).toBeDefined();
      expect(decoded.content.preferred_username).toBe("testuser");
    }, 30000);

    it("should reject invalid token", async () => {
      const invalidToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid";

      await expect(keycloak.jwt.verify(invalidToken)).rejects.toThrow();
    }, 30000);
  });

  describe("JWT Offline Verification", () => {
    let publicKey: string;

    beforeAll(async () => {
      // Fetch public key from Keycloak
      const axios = require("axios");
      const realmUrl = `${config.keycloak_base_url}/realms/${config.realm}`;
      const response = await axios.get(realmUrl);
      publicKey = response.data.public_key;
    });

    it("should verify token offline with public key", async () => {
      const accessToken = await keycloak.accessToken.get();

      // Format public key as PEM
      const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      const verified = await keycloak.jwt.verifyOffline(accessToken, publicKeyPem);

      expect(verified).toBeDefined();
      expect(verified.content.preferred_username).toBe("testuser");
    }, 30000);

    it("should reject token with wrong public key", async () => {
      const accessToken = await keycloak.accessToken.get();
      const wrongKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwrong
-----END PUBLIC KEY-----`;

      await expect(keycloak.jwt.verifyOffline(accessToken, wrongKey)).rejects.toThrow();
    }, 30000);

    it("should verify token expiry offline", async () => {
      const accessToken = await keycloak.accessToken.get();

      const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      const verified = await keycloak.jwt.verifyOffline(accessToken, publicKeyPem);

      expect(verified.isExpired()).toBe(false);
      expect(verified.content.exp).toBeGreaterThan(Date.now() / 1000);
    }, 30000);
  });

  describe("Token Expiry and Refresh", () => {
    it("should detect token expiry", async () => {
      const accessToken = await keycloak.accessToken.get();
      const token = keycloak.jwt.decode(accessToken);

      expect(token.isExpired()).toBe(false);

      // Verify the expiration time is in the future
      const currentTime = Math.floor(Date.now() / 1000);
      expect(token.content.exp).toBeGreaterThan(currentTime);
    }, 30000);
  });

  describe("Error Handling", () => {
    it("should handle invalid credentials", async () => {
      const invalidKeycloak = new Keycloak({
        ...config,
        username: "invalid",
        password: "invalid",
      });

      await expect(invalidKeycloak.accessToken.get()).rejects.toThrow();
    }, 30000);

    it("should handle invalid client secret", async () => {
      const invalidKeycloak = new Keycloak({
        ...config,
        client_secret: "invalid-secret",
        username: undefined,
        password: undefined,
      });

      await expect(invalidKeycloak.accessToken.get()).rejects.toThrow();
    }, 30000);

    it("should handle invalid realm", async () => {
      const invalidKeycloak = new Keycloak({
        ...config,
        realm: "nonexistent-realm",
      });

      await expect(invalidKeycloak.accessToken.get()).rejects.toThrow();
    }, 30000);
  });

  describe("Security Features", () => {
    it("should respect timeout configuration", async () => {
      const timeoutKeycloak = new Keycloak({
        ...config,
        timeout: 1, // 1ms timeout
      });

      // This should timeout
      await expect(timeoutKeycloak.accessToken.get()).rejects.toThrow();
    }, 30000);

    it("should handle custom error callback", async () => {
      const errors: Array<{ error: any; context: string }> = [];

      const errorKeycloak = new Keycloak({
        ...config,
        username: "invalid",
        password: "invalid",
        onError: (error, context) => {
          errors.push({ error, context });
        },
      });

      await expect(errorKeycloak.accessToken.get()).rejects.toThrow();

      expect(errors.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("Multiple Scopes", () => {
    it("should request token with custom scope", async () => {
      const accessToken = await keycloak.accessToken.get("openid profile email");
      const token = keycloak.jwt.decode(accessToken);

      expect(accessToken).toBeDefined();
      expect(token.content.preferred_username).toBe("testuser");
    }, 30000);

    it("should request token with offline_access scope", async () => {
      const accessToken = await keycloak.accessToken.get("openid offline_access");
      const token = keycloak.jwt.decode(accessToken);

      expect(accessToken).toBeDefined();
      expect(token.content.preferred_username).toBe("testuser");
    }, 30000);
  });
});
