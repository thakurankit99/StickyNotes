##################################################################################
FROM --platform=$BUILDPLATFORM node:20-alpine AS plik-frontend-builder

# Install needed binaries
RUN apk add --no-cache git make bash

# Add the source code
COPY Makefile .
COPY webapp /webapp

# Make sure our custom directories exist
RUN mkdir -p /webapp/js /webapp/css /webapp/dist/js /webapp/dist/css

# Create our custom JS and CSS files if they don't exist
RUN touch /webapp/js/sticky-notes.js
RUN touch /webapp/js/board-controller.js
RUN touch /webapp/css/notes-styles.css
RUN touch /webapp/css/board-view.css

# Copy our custom files to webapp directory
COPY webapp/js/sticky-notes.js /webapp/js/sticky-notes.js
COPY webapp/js/board-controller.js /webapp/js/board-controller.js
COPY webapp/css/notes-styles.css /webapp/css/notes-styles.css
COPY webapp/css/board-view.css /webapp/css/board-view.css

# Also copy them to the dist directory to ensure they're included
COPY webapp/js/sticky-notes.js /webapp/dist/js/sticky-notes.js
COPY webapp/js/board-controller.js /webapp/dist/js/board-controller.js
COPY webapp/css/notes-styles.css /webapp/dist/css/notes-styles.css
COPY webapp/css/board-view.css /webapp/dist/css/board-view.css

# Run the frontend build
RUN make clean-frontend frontend

# Make sure our custom files are still in the dist directory after build
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

RUN apk add --no-cache ca-certificates nginx

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

# Create required Nginx directories and set proper permissions
RUN mkdir -p /var/lib/nginx/logs /var/lib/nginx/tmp/client_body /var/lib/nginx/tmp/proxy \
    && chown -R plik:plik /var/lib/nginx \
    && chmod -R 755 /var/lib/nginx

# Configure Nginx to serve files with correct MIME types
RUN mkdir -p /etc/nginx/http.d
COPY <<EOF /etc/nginx/http.d/default.conf
server {
    listen 8081;
    server_name _;
    root /home/plik/webapp;

    # Proper MIME types - use the one from mime.types and don't duplicate
    include /etc/nginx/mime.types;
    
    # Only add types not already defined in mime.types
    types {
        # Any additional MIME types would go here
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Ensure proper content types for JS and CSS without duplicating
    location ~ \.js$ {
        add_header Content-Type "application/javascript";
    }

    location ~ \.css$ {
        add_header Content-Type "text/css";
    }
}
EOF

# Create a startup script
RUN echo '#!/bin/sh' > /home/plik/start.sh && \
    echo 'cd /home/plik/server' >> /home/plik/start.sh && \
    echo 'nginx -g "daemon off;" &' >> /home/plik/start.sh && \
    echo './plikd "$@"' >> /home/plik/start.sh && \
    chmod +x /home/plik/start.sh && \
    chown ${UID}:${UID} /home/plik/start.sh

# Copy the render init script
COPY render-init.sh /home/plik/render-init.sh
RUN chmod +x /home/plik/render-init.sh && \
    chown ${UID}:${UID} /home/plik/render-init.sh

# Copy the JS/CSS files from builder to final image
COPY --from=plik-frontend-builder /webapp/dist/js/sticky-notes.js /home/plik/webapp/js/
COPY --from=plik-frontend-builder /webapp/dist/js/board-controller.js /home/plik/webapp/js/
COPY --from=plik-frontend-builder /webapp/dist/css/notes-styles.css /home/plik/webapp/css/
COPY --from=plik-frontend-builder /webapp/dist/css/board-view.css /home/plik/webapp/css/

EXPOSE 8080 8081
USER plik
WORKDIR /home/plik
CMD ["./start.sh"]
