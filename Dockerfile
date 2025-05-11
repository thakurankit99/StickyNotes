##################################################################################
FROM --platform=$BUILDPLATFORM node:20-alpine AS plik-frontend-builder

# Install needed binaries
RUN apk add --no-cache git make bash

# Add the source code
COPY Makefile .
COPY webapp /webapp

# Ensure our custom JS and CSS files are copied before the build
RUN mkdir -p /webapp/dist/js /webapp/dist/css && \
    if [ -f /webapp/js/sticky-notes.js ]; then cp /webapp/js/sticky-notes.js /webapp/dist/js/; fi && \
    if [ -f /webapp/js/board-controller.js ]; then cp /webapp/js/board-controller.js /webapp/dist/js/; fi && \
    if [ -f /webapp/css/notes-styles.css ]; then cp /webapp/css/notes-styles.css /webapp/dist/css/; fi && \
    if [ -f /webapp/css/board-view.css ]; then cp /webapp/css/board-view.css /webapp/dist/css/; fi

RUN make clean-frontend frontend

##################################################################################
FROM --platform=$BUILDPLATFORM golang:1-bullseye AS plik-builder

# Install needed binaries
RUN apt-get update && apt-get install -y build-essential crossbuild-essential-armhf crossbuild-essential-armel crossbuild-essential-arm64 crossbuild-essential-i386 git

# Prepare the source location
RUN mkdir -p /go/src/github.com/root-gg/plik
WORKDIR /go/src/github.com/root-gg/plik

# Copy webapp build from previous stage
COPY --from=plik-frontend-builder /webapp/dist webapp/dist

# Ensure our custom JS and CSS files are preserved after frontend build
RUN mkdir -p webapp/dist/js webapp/dist/css

ARG CLIENT_TARGETS=""
ENV CLIENT_TARGETS=$CLIENT_TARGETS

ARG TARGETOS TARGETARCH TARGETVARIANT CC
ENV TARGETOS=$TARGETOS
ENV TARGETARCH=$TARGETARCH
ENV TARGETVARIANT=$TARGETVARIANT
ENV CC=$CC

# Initialize git repository and set a version
RUN git init && \
    git config --global user.email "docker@build.local" && \
    git config --global user.name "Docker Build"

# Add the source code ( see .dockerignore )
COPY . .

# Make all scripts executable, create git tag, and run the releaser
RUN chmod +x releaser/releaser.sh && \
    chmod +x server/gen_build_info.sh && \
    find . -name "*.sh" -type f -exec chmod +x {} \; && \
    git add . && \
    git commit -m "Docker build commit" && \
    git tag -a "v1.0.0" -m "Docker build tag" && \
    releaser/releaser.sh

##################################################################################
FROM scratch AS plik-release-archive

COPY --from=plik-builder --chown=1000:1000 /go/src/github.com/root-gg/plik/plik-*.tar.gz /

##################################################################################
FROM alpine:3.18 AS plik-image

RUN apk add --no-cache ca-certificates

# Create plik user
ENV USER=plik
ENV UID=1000

# See https://stackoverflow.com/a/55757473/12429735
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/home/plik" \
    --shell "/bin/false" \
    --uid "${UID}" \
    "${USER}"

COPY --from=plik-builder --chown=1000:1000 /go/src/github.com/root-gg/plik/release /home/plik/

# Create MIME type configuration file for the server
RUN echo '{"application/javascript": ["js"], "text/css": ["css"]}' > /home/plik/mime.types.json && \
    chown ${UID}:${UID} /home/plik/mime.types.json

# Create a startup script to configure the server with correct MIME types
RUN echo '#!/bin/sh' > /home/plik/start.sh && \
    echo 'cd /home/plik/server' >> /home/plik/start.sh && \
    echo 'export PLIK_MIME_CONFIG=/home/plik/mime.types.json' >> /home/plik/start.sh && \
    echo './plikd "$@"' >> /home/plik/start.sh && \
    chmod +x /home/plik/start.sh && \
    chown ${UID}:${UID} /home/plik/start.sh

EXPOSE 8080
USER plik
WORKDIR /home/plik
CMD ["./start.sh"]
