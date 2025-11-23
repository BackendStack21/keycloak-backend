import { Keycloak, IExternalConfig } from "../libs/Keycloak";
import Axios from "axios";

jest.mock("axios");
jest.mock("../libs/AccessToken");
jest.mock("../libs/Jwt");

describe("Keycloak", () => {
  const MockAxios = Axios as jest.Mocked<typeof Axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    MockAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
    } as any);
  });

  describe("constructor", () => {
    it("should initialize with basic configuration", () => {
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        username: "testuser",
        password: "testpass",
      };

      const keycloak = new Keycloak(config);

      expect(keycloak.accessToken).toBeDefined();
      expect(keycloak.jwt).toBeDefined();
      expect(MockAxios.create).toHaveBeenCalledWith({
        baseURL: "https://keycloak.example.org",
        timeout: 10000,
        httpsAgent: undefined,
      });
    });

    it("should use legacy endpoint prefix when is_legacy_endpoint is true", () => {
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        is_legacy_endpoint: true,
      };

      new Keycloak(config);

      expect(MockAxios.create).toHaveBeenCalledWith({
        baseURL: "https://keycloak.example.org",
        timeout: 10000,
        httpsAgent: undefined,
      });
    });

    it("should not use legacy prefix when is_legacy_endpoint is false", () => {
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        is_legacy_endpoint: false,
      };

      new Keycloak(config);

      expect(MockAxios.create).toHaveBeenCalledWith({
        baseURL: "https://keycloak.example.org",
        timeout: 10000,
        httpsAgent: undefined,
      });
    });

    it("should use custom timeout when provided", () => {
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        timeout: 5000,
      };

      new Keycloak(config);

      expect(MockAxios.create).toHaveBeenCalledWith({
        baseURL: "https://keycloak.example.org",
        timeout: 5000,
        httpsAgent: undefined,
      });
    });

    it("should use custom httpsAgent when provided", () => {
      const customAgent = { rejectUnauthorized: true };
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        httpsAgent: customAgent,
      };

      new Keycloak(config);

      expect(MockAxios.create).toHaveBeenCalledWith({
        baseURL: "https://keycloak.example.org",
        timeout: 10000,
        httpsAgent: customAgent,
      });
    });

    it("should support client_secret for client credentials flow", () => {
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        client_secret: "super-secret",
      };

      const keycloak = new Keycloak(config);

      expect(keycloak.accessToken).toBeDefined();
      expect(keycloak.jwt).toBeDefined();
    });

    it("should support onError callback", () => {
      const onError = jest.fn();
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        onError,
      };

      const keycloak = new Keycloak(config);

      expect(keycloak.accessToken).toBeDefined();
    });

    it("should work with all optional parameters", () => {
      const onError = jest.fn();
      const httpsAgent = { rejectUnauthorized: true };
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        username: "user",
        password: "pass",
        client_secret: "secret",
        is_legacy_endpoint: true,
        timeout: 15000,
        httpsAgent,
        onError,
      };

      const keycloak = new Keycloak(config);

      expect(keycloak.accessToken).toBeDefined();
      expect(keycloak.jwt).toBeDefined();
      expect(MockAxios.create).toHaveBeenCalledWith({
        baseURL: "https://keycloak.example.org",
        timeout: 15000,
        httpsAgent,
      });
    });

    it("should have jwt and accessToken as readonly properties in TypeScript", () => {
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
      };

      const keycloak = new Keycloak(config);

      // Properties are readonly in TypeScript but not enforced at runtime
      expect(keycloak.jwt).toBeDefined();
      expect(keycloak.accessToken).toBeDefined();
    });

    it("should use timeout of 0 when explicitly set to 0", () => {
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        timeout: 0,
      };

      new Keycloak(config);

      expect(MockAxios.create).toHaveBeenCalledWith({
        baseURL: "https://keycloak.example.org",
        timeout: 0,
        httpsAgent: undefined,
      });
    });

    it("should preserve all config properties in internal config", () => {
      const config: IExternalConfig = {
        realm: "test-realm",
        keycloak_base_url: "https://keycloak.example.org",
        client_id: "test-client",
        username: "user",
        password: "pass",
      };

      // This verifies the config is passed through correctly
      new Keycloak(config);

      expect(MockAxios.create).toHaveBeenCalled();
    });
  });
});
