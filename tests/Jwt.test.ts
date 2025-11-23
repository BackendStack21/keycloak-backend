import { Jwt } from "../libs/Jwt";
import { Token } from "../libs/Token";
import { AxiosInstance } from "axios";
import { verify } from "jsonwebtoken";

jest.mock("jsonwebtoken");
jest.mock("../libs/Token");

describe("Jwt", () => {
  let mockRequest: jest.Mocked<AxiosInstance>;
  let jwt: Jwt;
  const mockConfig = {
    realm: "test-realm",
    keycloak_base_url: "https://keycloak.example.org",
    client_id: "test-client",
    prefix: "",
  };

  const mockVerify = verify as jest.MockedFunction<typeof verify>;
  const MockToken = Token as jest.MockedClass<typeof Token>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      get: jest.fn(),
    } as any;

    jwt = new Jwt(mockConfig, mockRequest);
  });

  describe("verify", () => {
    it("should verify token online and return Token instance", async () => {
      const accessToken = "valid.access.token";
      mockRequest.get.mockResolvedValue({ data: { sub: "user-123" } });

      const result = await jwt.verify(accessToken);

      expect(mockRequest.get).toHaveBeenCalledWith("/realms/test-realm/protocol/openid-connect/userinfo", {
        headers: {
          Authorization: "Bearer valid.access.token",
        },
      });
      expect(MockToken).toHaveBeenCalledWith(accessToken);
      expect(result).toBeInstanceOf(Token);
    });

    it("should use prefix for legacy endpoints", async () => {
      const legacyJwt = new Jwt({ ...mockConfig, prefix: "/auth" }, mockRequest);
      const accessToken = "valid.access.token";
      mockRequest.get.mockResolvedValue({ data: { sub: "user-123" } });

      await legacyJwt.verify(accessToken);

      expect(mockRequest.get).toHaveBeenCalledWith(
        "/auth/realms/test-realm/protocol/openid-connect/userinfo",
        expect.any(Object)
      );
    });

    it("should throw error when verification fails", async () => {
      const accessToken = "invalid.access.token";
      mockRequest.get.mockRejectedValue(new Error("Unauthorized"));

      await expect(jwt.verify(accessToken)).rejects.toThrow("Unauthorized");
    });
  });

  describe("verifyOffline", () => {
    it("should verify token offline with default RS256 algorithm", async () => {
      const accessToken = "valid.jwt.token";
      const cert = "PUBLIC_CERT_CONTENT";

      mockVerify.mockImplementation((token, secret, options, callback: any) => {
        callback(null);
      });

      const result = await jwt.verifyOffline(accessToken, cert);

      expect(mockVerify).toHaveBeenCalledWith(accessToken, cert, { algorithms: ["RS256"] }, expect.any(Function));
      expect(MockToken).toHaveBeenCalledWith(accessToken);
      expect(result).toBeInstanceOf(Token);
    });

    it("should allow custom options while preserving default algorithms", async () => {
      const accessToken = "valid.jwt.token";
      const cert = "PUBLIC_CERT_CONTENT";
      const customOptions = { issuer: "https://keycloak.example.org" };

      mockVerify.mockImplementation((token, secret, options, callback: any) => {
        callback(null);
      });

      await jwt.verifyOffline(accessToken, cert, customOptions);

      expect(mockVerify).toHaveBeenCalledWith(
        accessToken,
        cert,
        { algorithms: ["RS256"], issuer: "https://keycloak.example.org" },
        expect.any(Function)
      );
    });

    it("should reject when verification fails", async () => {
      const accessToken = "invalid.jwt.token";
      const cert = "PUBLIC_CERT_CONTENT";

      mockVerify.mockImplementation((token, secret, options, callback: any) => {
        callback(new Error("Invalid signature"));
      });

      await expect(jwt.verifyOffline(accessToken, cert)).rejects.toThrow("Invalid signature");
    });

    it("should allow overriding algorithms in options", async () => {
      const accessToken = "valid.jwt.token";
      const cert = "PUBLIC_CERT_CONTENT";
      const customOptions = { algorithms: ["RS512"] as any };

      mockVerify.mockImplementation((token, secret, options, callback: any) => {
        callback(null);
      });

      await jwt.verifyOffline(accessToken, cert, customOptions);

      expect(mockVerify).toHaveBeenCalledWith(accessToken, cert, { algorithms: ["RS512"] }, expect.any(Function));
    });
  });

  describe("decode", () => {
    it("should decode token without verification", () => {
      const accessToken = "some.jwt.token";

      const result = jwt.decode(accessToken);

      expect(MockToken).toHaveBeenCalledWith(accessToken);
      expect(result).toBeInstanceOf(Token);
    });

    it("should not make any HTTP requests", () => {
      const accessToken = "some.jwt.token";

      jwt.decode(accessToken);

      expect(mockRequest.get).not.toHaveBeenCalled();
    });
  });
});
