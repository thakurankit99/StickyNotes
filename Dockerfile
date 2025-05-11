##################################################################################
FROM --platform=$BUILDPLATFORM node:20-alpine AS plik-frontend-builder

# Install needed binaries
RUN apk add --no-cache git make bash

# Add the source code
COPY Makefile .
COPY webapp /webapp

# Ensure our custom directories exist
RUN mkdir -p /webapp/js /webapp/css /webapp/dist/js /webapp/dist/css

# Copy our sticky notes files to webapp directory
COPY webapp/js/sticky-notes.js /webapp/js/sticky-notes.js
COPY webapp/js/board-controller.js /webapp/js/board-controller.js
COPY webapp/css/notes-styles.css /webapp/css/notes-styles.css
COPY webapp/css/board-view.css /webapp/css/board-view.css

# Run the frontend build
RUN make clean-frontend frontend

# Ensure our custom files are preserved after build
RUN cp -f /webapp/js/sticky-notes.js /webapp/dist/js/ || true
RUN cp -f /webapp/js/board-controller.js /webapp/dist/js/ || true
RUN cp -f /webapp/css/notes-styles.css /webapp/dist/css/ || true
RUN cp -f /webapp/css/board-view.css /webapp/dist/css/ || true

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

##################################################################################
FROM scratch AS plik-release-archive

COPY --from=plik-builder --chown=1000:1000 /go/src/github.com/root-gg/plik/plik-*.tar.gz /

##################################################################################
FROM alpine:3.18 AS plik-image

# Add necessary packages including PostgreSQL client
RUN apk add --no-cache ca-certificates postgresql-client

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

EXPOSE 8080
USER plik
WORKDIR /home/plik/server
CMD ["./plikd"]
