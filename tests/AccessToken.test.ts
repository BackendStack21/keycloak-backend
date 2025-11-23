import { AccessToken } from "../libs/AccessToken";
import { AxiosInstance } from "axios";
import { stringify } from "querystring";

describe("AccessToken", () => {
  let mockClient: jest.Mocked<AxiosInstance>;
  let accessToken: AccessToken;
  let mockConfig: any;
  let onErrorSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onErrorSpy = jest.fn();

    mockConfig = {
      realm: "test-realm",
      keycloak_base_url: "https://keycloak.example.org",
      client_id: "test-client",
      username: "testuser",
      password: "testpass",
      prefix: "",
      onError: onErrorSpy,
    };

    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
    } as any;

    accessToken = new AccessToken(mockConfig, mockClient);
  });

  describe("info", () => {
    it("should retrieve user info with access token", async () => {
      const token = "valid.access.token";
      const mockUserInfo = { sub: "user-123", email: "user@example.org" };

      mockClient.get.mockResolvedValue({ data: mockUserInfo });

      const result = await accessToken.info(token);

      expect(mockClient.get).toHaveBeenCalledWith("/realms/test-realm/protocol/openid-connect/userinfo", {
        headers: {
          Authorization: "Bearer valid.access.token",
        },
      });
      expect(result).toEqual(mockUserInfo);
    });

    it("should use prefix for legacy endpoints", async () => {
      const legacyConfig = { ...mockConfig, prefix: "/auth" };
      const legacyAccessToken = new AccessToken(legacyConfig, mockClient);
      const token = "valid.access.token";

      mockClient.get.mockResolvedValue({ data: {} });

      await legacyAccessToken.info(token);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/auth/realms/test-realm/protocol/openid-connect/userinfo",
        expect.any(Object)
      );
    });

    it("should throw error on failed request", async () => {
      const token = "invalid.token";
      mockClient.get.mockRejectedValue(new Error("Unauthorized"));

      await expect(accessToken.info(token)).rejects.toThrow("Unauthorized");
    });

    it("should work with config that has client_secret", async () => {
      const configWithSecret = { ...mockConfig, client_secret: "secret123" };
      const atWithSecret = new AccessToken(configWithSecret, mockClient);
      const token = "valid.access.token";
      const mockUserInfo = { sub: "user-123" };

      mockClient.get.mockResolvedValue({ data: mockUserInfo });

      const result = await atWithSecret.info(token);

      expect(result).toEqual(mockUserInfo);
    });
  });

  describe("refresh", () => {
    it("should refresh token using refresh_token", async () => {
      const refreshToken = "valid.refresh.token";
      const mockResponse = {
        data: {
          access_token: "new.access.token",
          refresh_token: "new.refresh.token",
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await accessToken.refresh(refreshToken);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/realms/test-realm/protocol/openid-connect/token",
        stringify({
          grant_type: "refresh_token",
          client_id: "test-client",
          refresh_token: refreshToken,
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should include client_secret when provided", async () => {
      const configWithSecret = { ...mockConfig, client_secret: "super-secret" };
      const accessTokenWithSecret = new AccessToken(configWithSecret, mockClient);
      const refreshToken = "valid.refresh.token";

      mockClient.post.mockResolvedValue({ data: {} });

      await accessTokenWithSecret.refresh(refreshToken);

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        stringify({
          grant_type: "refresh_token",
          client_id: "test-client",
          refresh_token: refreshToken,
          client_secret: "super-secret",
        })
      );
    });

    it("should throw error on failed refresh", async () => {
      const refreshToken = "invalid.refresh.token";
      mockClient.post.mockRejectedValue(new Error("Invalid refresh token"));

      await expect(accessToken.refresh(refreshToken)).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("get", () => {
    it("should get new access token when data is null", async () => {
      const mockResponse = {
        data: {
          access_token: "new.access.token",
          refresh_token: "new.refresh.token",
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await accessToken.get();

      expect(mockClient.post).toHaveBeenCalledWith(
        "/realms/test-realm/protocol/openid-connect/token",
        stringify({
          grant_type: "password",
          client_id: "test-client",
          username: "testuser",
          password: "testpass",
          scope: "openid",
        })
      );
      expect(result).toBe("new.access.token");
    });

    it("should include scope when provided", async () => {
      const mockResponse = {
        data: {
          access_token: "new.access.token",
          refresh_token: "new.refresh.token",
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);

      await accessToken.get("openid profile");

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        stringify({
          grant_type: "password",
          client_id: "test-client",
          username: "testuser",
          password: "testpass",
          scope: "openid profile",
        })
      );
    });

    it("should use client_credentials grant when no username/password provided", async () => {
      const configNoAuth = { ...mockConfig };
      delete configNoAuth.username;
      delete configNoAuth.password;
      configNoAuth.client_secret = "super-secret";
      const accessTokenNoAuth = new AccessToken(configNoAuth, mockClient);

      mockClient.post.mockResolvedValue({
        data: {
          access_token: "new.access.token",
          refresh_token: "new.refresh.token",
        },
      });

      await accessTokenNoAuth.get();

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        stringify({
          grant_type: "client_credentials",
          client_id: "test-client",
          client_secret: "super-secret",
          scope: "openid",
        })
      );
    });

    it("should return cached token when still valid", async () => {
      const mockResponse = {
        data: {
          access_token: "cached.access.token",
          refresh_token: "cached.refresh.token",
        },
      };

      mockClient.post.mockResolvedValue(mockResponse);
      mockClient.get.mockResolvedValue({ data: { sub: "user-123" } });

      // First call to populate cache
      const firstToken = await accessToken.get();
      expect(firstToken).toBe("cached.access.token");

      // Second call should use cache
      const secondToken = await accessToken.get();
      expect(secondToken).toBe("cached.access.token");
      expect(mockClient.post).toHaveBeenCalledTimes(1);
      expect(mockClient.get).toHaveBeenCalledTimes(1);
    });

    it("should refresh token when cached token is invalid", async () => {
      const initialResponse = {
        data: {
          access_token: "initial.access.token",
          refresh_token: "initial.refresh.token",
        },
      };

      const refreshResponse = {
        data: {
          access_token: "refreshed.access.token",
          refresh_token: "refreshed.refresh.token",
        },
      };

      mockClient.post.mockResolvedValueOnce(initialResponse).mockResolvedValueOnce(refreshResponse);

      // First call to populate cache
      await accessToken.get();

      // Mock info call failing (token invalid)
      mockClient.get.mockRejectedValueOnce(new Error("Token expired"));

      // Second call should refresh token
      const result = await accessToken.get();

      expect(result).toBe("refreshed.access.token");
      expect(mockClient.post).toHaveBeenCalledTimes(2);
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:info");
    });

    it("should re-authenticate when refresh fails", async () => {
      const initialResponse = {
        data: {
          access_token: "initial.access.token",
          refresh_token: "initial.refresh.token",
        },
      };

      const newAuthResponse = {
        data: {
          access_token: "new.auth.token",
          refresh_token: "new.auth.refresh.token",
        },
      };

      mockClient.post
        .mockResolvedValueOnce(initialResponse)
        .mockRejectedValueOnce(new Error("Refresh token expired"))
        .mockResolvedValueOnce(newAuthResponse);

      // First call to populate cache
      await accessToken.get();

      // Mock info and refresh failing
      mockClient.get.mockRejectedValueOnce(new Error("Token expired"));

      // Should re-authenticate
      const result = await accessToken.get();

      expect(result).toBe("new.auth.token");
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:info");
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:refresh");
    });

    it("should re-authenticate when no refresh token available", async () => {
      const initialResponse = {
        data: {
          access_token: "initial.access.token",
          refresh_token: null,
        },
      };

      const newAuthResponse = {
        data: {
          access_token: "new.auth.token",
          refresh_token: "new.auth.refresh.token",
        },
      };

      mockClient.post
        .mockResolvedValueOnce(initialResponse)
        // Reauth
        .mockResolvedValueOnce(newAuthResponse);

      // First call to populate cache
      await accessToken.get();

      // Mock info failing so refresh path is taken
      mockClient.get.mockRejectedValueOnce(new Error("Token expired"));

      const result = await accessToken.get();

      expect(result).toBe("new.auth.token");
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:info");
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:refresh");
    });

    it("should throw error when depth parameter equals maxRetries", async () => {
      // Call with depth=3 (equals maxRetries)
      await expect(accessToken.get(undefined, 3)).rejects.toThrow("Max authentication retry depth exceeded");
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Max authentication retry depth exceeded" }),
        "AccessToken.get"
      );
    });

    it("should throw error and log when token request fails", async () => {
      mockClient.post.mockRejectedValue(new Error("Network error"));
      await expect(accessToken.get()).rejects.toThrow("Network error");
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:request");
    });

    it("should call onError callback on errors", async () => {
      const initialResponse = {
        data: {
          access_token: "initial.access.token",
          refresh_token: "initial.refresh.token",
        },
      };

      mockClient.post.mockResolvedValueOnce(initialResponse);

      // First call
      await accessToken.get();

      // Mock failures
      const infoError = new Error("Info failed");
      mockClient.get.mockRejectedValueOnce(infoError);
      mockClient.post.mockRejectedValueOnce(new Error("Refresh failed"));
      mockClient.post.mockResolvedValueOnce({
        data: {
          access_token: "new.token",
          refresh_token: "new.refresh",
        },
      });

      await accessToken.get();

      expect(onErrorSpy).toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:info");
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:refresh");
    });

    it("should not call onError when not configured", async () => {
      const configNoError = { ...mockConfig };
      delete configNoError.onError;
      const accessTokenNoError = new AccessToken(configNoError, mockClient);

      const response = {
        data: {
          access_token: "token",
          refresh_token: "refresh",
        },
      };

      mockClient.post.mockResolvedValueOnce(response);
      mockClient.get.mockRejectedValueOnce(new Error("Failed"));
      mockClient.post.mockRejectedValueOnce(new Error("Refresh failed"));
      mockClient.post.mockResolvedValueOnce(response);

      await accessTokenNoError.get();

      // Should not throw even without onError callback
      expect(mockClient.post).toHaveBeenCalled();
    });

    it("should handle non-Error objects in catch blocks", async () => {
      const response = {
        data: {
          access_token: "token",
          refresh_token: "refresh",
        },
      };

      mockClient.post.mockResolvedValueOnce(response);

      await accessToken.get();

      mockClient.get.mockRejectedValueOnce("string error");
      mockClient.post.mockRejectedValueOnce({ code: "ERROR" });
      mockClient.post.mockResolvedValueOnce(response);

      const result = await accessToken.get();

      expect(result).toBe("token");
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:info");
      expect(onErrorSpy).toHaveBeenCalledWith(expect.any(Error), "AccessToken.get:refresh");
    });

    it("should preserve scope parameter during retry", async () => {
      const response = {
        data: {
          access_token: "token",
          refresh_token: "refresh",
        },
      };

      mockClient.post.mockResolvedValueOnce(response);
      mockClient.get.mockRejectedValueOnce(new Error("Failed"));
      mockClient.post.mockRejectedValueOnce(new Error("Refresh failed"));
      mockClient.post.mockResolvedValueOnce(response);

      await accessToken.get("openid profile");

      // Check that last call includes the scope (querystring uses %20 for spaces)
      const lastCall = mockClient.post.mock.calls[mockClient.post.mock.calls.length - 1];
      expect(lastCall[1]).toContain("scope=openid%20profile");
    });
  });
});
