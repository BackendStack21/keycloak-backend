#!/usr/bin/env node

/**
 * Wait for Keycloak to be ready before running integration tests.
 * This script polls the Keycloak health endpoint until it responds successfully.
 */

const http = require("http");

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const MAX_ATTEMPTS = 60; // 60 attempts
const RETRY_DELAY = 2000; // 2 seconds

function checkKeycloak(attempt = 1) {
  return new Promise((resolve, reject) => {
    // Check if the test realm is available, which confirms Keycloak is up and import finished
    const url = new URL(`${KEYCLOAK_URL}/realms/test-realm`);

    const req = http.get(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        timeout: 5000,
      },
      (res) => {
        if (res.statusCode === 200) {
          console.log("✅ Keycloak is ready!");
          resolve();
        } else {
          if (attempt >= MAX_ATTEMPTS) {
            reject(new Error(`Keycloak not ready after ${MAX_ATTEMPTS} attempts`));
          } else {
            console.log(`⏳ Waiting for Keycloak... (attempt ${attempt}/${MAX_ATTEMPTS})`);
            setTimeout(() => {
              checkKeycloak(attempt + 1)
                .then(resolve)
                .catch(reject);
            }, RETRY_DELAY);
          }
        }
      }
    );

    req.on("error", (err) => {
      if (attempt >= MAX_ATTEMPTS) {
        reject(new Error(`Keycloak not ready after ${MAX_ATTEMPTS} attempts: ${err.message}`));
      } else {
        console.log(`⏳ Waiting for Keycloak... (attempt ${attempt}/${MAX_ATTEMPTS})`);
        setTimeout(() => {
          checkKeycloak(attempt + 1)
            .then(resolve)
            .catch(reject);
        }, RETRY_DELAY);
      }
    });

    req.on("timeout", () => {
      req.destroy();
      if (attempt >= MAX_ATTEMPTS) {
        reject(new Error(`Keycloak not ready after ${MAX_ATTEMPTS} attempts: timeout`));
      } else {
        console.log(`⏳ Waiting for Keycloak... (attempt ${attempt}/${MAX_ATTEMPTS})`);
        setTimeout(() => {
          checkKeycloak(attempt + 1)
            .then(resolve)
            .catch(reject);
        }, RETRY_DELAY);
      }
    });
  });
}

console.log(`🔍 Checking Keycloak at ${KEYCLOAK_URL}...`);
checkKeycloak()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
