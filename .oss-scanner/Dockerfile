# Build image for Anthropic OSS Scanner (https://github.com/anthropics/oss-scanner).
# Network is available only during this build; everything the tests need is installed here.
FROM node:22-bookworm
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates git openssl python3 \
    && rm -rf /var/lib/apt/lists/*

# scanner contract: the checkout lives inside the image, at /src
COPY . /src
WORKDIR /src

# no lockfile in this repo; `prepare` compiles TypeScript into dist/
RUN npm install && npm run build

# Unit tests only: the integration suite needs a live Keycloak via docker compose.
RUN npm run test:coverage || echo "WARNING: tests reported failures"
