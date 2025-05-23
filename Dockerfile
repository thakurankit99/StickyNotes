##################################################################################
FROM --platform=$BUILDPLATFORM node:20-alpine AS plik-frontend-builder

# Install needed binaries
RUN apk add --no-cache git make bash

# Add the source code
COPY Makefile .
COPY webapp /webapp

# Ensure our custom directories exist
RUN mkdir -p /webapp/js /webapp/css /webapp/dist/js /webapp/dist/css /webapp/dist/favicon

# Copy our sticky notes files to webapp directory
COPY webapp/js/sticky-notes.js /webapp/js/sticky-notes.js
COPY webapp/js/board-controller.js /webapp/js/board-controller.js
COPY webapp/css/notes-styles.css /webapp/css/notes-styles.css
COPY webapp/css/board-view.css /webapp/css/board-view.css

# Copy favicon directory
COPY webapp/favicon /webapp/favicon
COPY webapp/favicon /webapp/dist/favicon

# Run the frontend build
RUN make clean-frontend frontend

# Ensure our custom files are preserved after build
RUN cp -f /webapp/js/sticky-notes.js /webapp/dist/js/ || true
RUN cp -f /webapp/js/board-controller.js /webapp/dist/js/ || true
RUN cp -f /webapp/css/notes-styles.css /webapp/dist/css/ || true
RUN cp -f /webapp/css/board-view.css /webapp/dist/css/ || true

# Ensure favicon files are preserved after build
RUN cp -rf /webapp/favicon/* /webapp/dist/favicon/ || true

##################################################################################
FROM --platform=$BUILDPLATFORM golang:1-bullseye AS plik-builder

# Install needed binaries
RUN apt-get update && apt-get install -y build-essential crossbuild-essential-armhf crossbuild-essential-armel crossbuild-essential-arm64 crossbuild-essential-i386 git

# Prepare the source location
RUN mkdir -p /go/src/github.com/root-gg/plik
WORKDIR /go/src/github.com/root-gg/plik

# Copy webapp build from previous stage
COPY --from=plik-frontend-builder /webapp/dist webapp/dist

# Ensure our custom JS and CSS directories exist
RUN mkdir -p webapp/dist/js webapp/dist/css

# Initialize git repository and set a version
RUN git init && \
    git config --global user.email "docker@build.local" && \
    git config --global user.name "Docker Build"

ARG CLIENT_TARGETS=""
ENV CLIENT_TARGETS=$CLIENT_TARGETS

ARG TARGETOS TARGETARCH TARGETVARIANT CC
ENV TARGETOS=$TARGETOS
ENV TARGETARCH=$TARGETARCH
ENV TARGETVARIANT=$TARGETVARIANT
ENV CC=$CC

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

# Install necessary tools for health check
RUN apt-get update && apt-get install -y curl cron && rm -rf /var/lib/apt/lists/*

# Copy health check script
COPY health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Setup cron job for health check (every 4 minutes and 50 seconds)
RUN echo "*/4 * * * * sleep 50; /usr/local/bin/health-check.sh" > /etc/cron.d/health-check
RUN chmod 0644 /etc/cron.d/health-check
RUN crontab /etc/cron.d/health-check

# Start cron in the background and then run the main process
CMD service cron start && exec /bin/bash -c "YOUR_EXISTING_CMD"

##################################################################################
FROM scratch AS plik-release-archive

COPY --from=plik-builder --chown=1000:1000 /go/src/github.com/root-gg/plik/plik-*.tar.gz /

##################################################################################
FROM alpine:3.18 AS plik-image

# Add only necessary packages
RUN apk add --no-cache ca-certificates curl dcron

# Create plik user
ENV USER=plik
ENV UID=1000

RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/home/plik" \
    --shell "/bin/false" \
    --uid "${UID}" \
    "${USER}"

# Copy release files
COPY --from=plik-builder --chown=1000:1000 /go/src/github.com/root-gg/plik/release /home/plik/

# Copy the render init script (needed for Render.com deployment)
COPY render-init.sh /home/plik/render-init.sh
RUN chmod +x /home/plik/render-init.sh && \
    chown ${UID}:${UID} /home/plik/render-init.sh

# Copy the build-for-render script
COPY build-for-render.sh /home/plik/build-for-render.sh
RUN chmod +x /home/plik/build-for-render.sh && \
    chown ${UID}:${UID} /home/plik/build-for-render.sh

# Create health check script
RUN mkdir -p /home/plik/scripts
COPY health-check.sh /home/plik/scripts/health-check.sh
RUN chmod +x /home/plik/scripts/health-check.sh && \
    chown ${UID}:${UID} /home/plik/scripts/health-check.sh

# Create a startup script to run both cron and the server
RUN echo '#!/bin/sh' > /home/plik/start.sh && \
    echo 'echo "*/4 * * * * sleep 50; /home/plik/scripts/health-check.sh" > /tmp/crontab' >> /home/plik/start.sh && \
    echo 'crond -b -c /tmp' >> /home/plik/start.sh && \
    echo 'cd /home/plik/server && ./plikd' >> /home/plik/start.sh && \
    chmod +x /home/plik/start.sh && \
    chown ${UID}:${UID} /home/plik/start.sh

EXPOSE 8080
USER plik
WORKDIR /home/plik
CMD ["./start.sh"]
