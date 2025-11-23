import { Token } from "../libs/Token";
import { decode } from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("Token", () => {
  const mockDecode = decode as jest.MockedFunction<typeof decode>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a token with valid JWT payload", () => {
      const mockPayload = {
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: "user@example.org",
        preferred_username: "testuser",
        realm_access: { roles: ["user", "admin"] },
        resource_access: { "my-app": { roles: ["app-role"] } },
      };

      mockDecode.mockReturnValue(mockPayload);

      const token = new Token("mock.jwt.token");

      expect(token.token).toBe("mock.jwt.token");
      expect(token.content).toMatchObject(mockPayload);
      expect(mockDecode).toHaveBeenCalledWith("mock.jwt.token", { json: true });
    });

    it("should accept token with azp instead of aud", () => {
      const mockPayload = {
        iss: "https://keycloak.example.org",
        sub: "user-123",
        azp: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      mockDecode.mockReturnValue(mockPayload);

      const token = new Token("mock.jwt.token");

      expect(token.content.aud).toBe("client-app");
    });

    it("should throw error for token missing required iss field", () => {
      mockDecode.mockReturnValue({
        sub: "user-123",
        aud: "client-app",
        exp: 1234567890,
        iat: 1234567890,
      });

      expect(() => new Token("invalid.token")).toThrow("Invalid token");
    });

    it("should throw error for token missing required sub field", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        aud: "client-app",
        exp: 1234567890,
        iat: 1234567890,
      });

      expect(() => new Token("invalid.token")).toThrow("Invalid token");
    });

    it("should throw error for token missing required aud field", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        exp: 1234567890,
        iat: 1234567890,
      });

      expect(() => new Token("invalid.token")).toThrow("Invalid token");
    });

    it("should throw error for token missing required exp field", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        iat: 1234567890,
      });

      expect(() => new Token("invalid.token")).toThrow("Invalid token");
    });

    it("should throw error for token missing required iat field", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: 1234567890,
      });

      expect(() => new Token("invalid.token")).toThrow("Invalid token");
    });

    it("should throw error when decode returns null", () => {
      mockDecode.mockReturnValue(null);

      expect(() => new Token("invalid.token")).toThrow("Invalid token");
    });

    it("should throw error when payload is undefined", () => {
      mockDecode.mockReturnValue(undefined as any);

      expect(() => new Token("invalid.token")).toThrow("Invalid token");
    });

    it("should throw error when all fields except iss are missing", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
      });

      expect(() => new Token("invalid.token")).toThrow("Invalid token");
    });
  });

  describe("isExpired", () => {
    it("should return false for non-expired token", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: futureExp,
        iat: Math.floor(Date.now() / 1000),
      });

      const token = new Token("valid.token");

      expect(token.isExpired()).toBe(false);
    });

    it("should return true for expired token", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: pastExp,
        iat: Math.floor(Date.now() / 1000) - 7200,
      });

      const token = new Token("expired.token");

      expect(token.isExpired()).toBe(true);
    });

    it("should return true for token expiring at current time", () => {
      const nowExp = Math.floor(Date.now() / 1000);
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: nowExp,
        iat: nowExp - 3600,
      });

      const token = new Token("expiring.token");

      expect(token.isExpired()).toBe(true);
    });
  });

  describe("hasRealmRole", () => {
    it("should return true when user has the realm role", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        realm_access: { roles: ["user", "admin"] },
      });

      const token = new Token("valid.token");

      expect(token.hasRealmRole("user")).toBe(true);
      expect(token.hasRealmRole("admin")).toBe(true);
    });

    it("should return false when user does not have the realm role", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        realm_access: { roles: ["user"] },
      });

      const token = new Token("valid.token");

      expect(token.hasRealmRole("admin")).toBe(false);
    });

    it("should return false when realm_access is undefined", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      const token = new Token("valid.token");

      expect(token.hasRealmRole("user")).toBe(false);
    });

    it("should return false when realm_access.roles is undefined", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        realm_access: {},
      });

      const token = new Token("valid.token");

      expect(token.hasRealmRole("user")).toBe(false);
    });

    it("should return false when realm_access is null", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        realm_access: null,
      });

      const token = new Token("valid.token");

      expect(token.hasRealmRole("user")).toBe(false);
    });
  });

  describe("hasApplicationRole", () => {
    it("should return true when user has the application role", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        resource_access: {
          "my-app": { roles: ["viewer", "editor"] },
        },
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("my-app", "viewer")).toBe(true);
      expect(token.hasApplicationRole("my-app", "editor")).toBe(true);
    });

    it("should return false when user does not have the application role", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        resource_access: {
          "my-app": { roles: ["viewer"] },
        },
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("my-app", "admin")).toBe(false);
    });

    it("should return false when application does not exist", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        resource_access: {
          "my-app": { roles: ["viewer"] },
        },
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("other-app", "viewer")).toBe(false);
    });

    it("should return false when resource_access is undefined", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("my-app", "viewer")).toBe(false);
    });

    it("should return false when resource_access is null", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        resource_access: null,
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("my-app", "viewer")).toBe(false);
    });

    it("should return false when app roles is null", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        resource_access: {
          "my-app": null,
        },
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("my-app", "viewer")).toBe(false);
    });

    it("should return false when app roles.roles is undefined", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        resource_access: {
          "my-app": {},
        },
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("my-app", "viewer")).toBe(false);
    });
  });

  describe("token content access", () => {
    it("should expose all decoded token properties", () => {
      const mockPayload = {
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: "test@example.com",
        preferred_username: "testuser",
        family_name: "Doe",
        given_name: "John",
        name: "John Doe",
        email_verified: true,
        custom_claim: "custom_value",
      };

      mockDecode.mockReturnValue(mockPayload);

      const token = new Token("valid.token");

      expect(token.content.iss).toBe("https://keycloak.example.org");
      expect(token.content.sub).toBe("user-123");
      expect(token.content.aud).toBe("client-app");
      expect(token.content.email).toBe("test@example.com");
      expect(token.content.preferred_username).toBe("testuser");
      expect(token.content.family_name).toBe("Doe");
      expect(token.content.given_name).toBe("John");
      expect(token.content.name).toBe("John Doe");
      expect(token.content.email_verified).toBe(true);
      expect(token.content.custom_claim).toBe("custom_value");
    });

    it("should support aud as array", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: ["client-app-1", "client-app-2"],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      const token = new Token("valid.token");

      expect(Array.isArray(token.content.aud)).toBe(true);
      expect(token.content.aud).toEqual(["client-app-1", "client-app-2"]);
    });
  });

  describe("edge cases for realm_access and resource_access", () => {
    it("should handle realm_access with null roles array", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        realm_access: { roles: null },
      });

      const token = new Token("valid.token");

      expect(token.hasRealmRole("user")).toBe(false);
    });

    it("should handle resource_access with null app entry", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        resource_access: {
          "my-app": null,
        },
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("my-app", "viewer")).toBe(false);
    });

    it("should handle resource_access with null roles in app", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        resource_access: {
          "my-app": { roles: null },
        },
      });

      const token = new Token("valid.token");

      expect(token.hasApplicationRole("my-app", "viewer")).toBe(false);
    });

    it("should handle completely empty token with only required fields", () => {
      mockDecode.mockReturnValue({
        iss: "https://keycloak.example.org",
        sub: "user-123",
        aud: "client-app",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      const token = new Token("valid.token");

      expect(token.content.iss).toBe("https://keycloak.example.org");
      expect(token.content.sub).toBe("user-123");
      expect(token.content.realm_access).toBeUndefined();
      expect(token.content.resource_access).toBeUndefined();
      expect(token.hasRealmRole("user")).toBe(false);
      expect(token.hasApplicationRole("app", "role")).toBe(false);
    });
  });
});
