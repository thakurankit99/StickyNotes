##################################################################################
FROM --platform=$BUILDPLATFORM node:20-alpine AS plik-frontend-builder

# Install needed binaries - only what's actually required
RUN apk add --no-cache git make bash

# Add the source code
COPY Makefile .
COPY webapp /webapp

# Make sure our custom directories exist
RUN mkdir -p /webapp/js /webapp/css /webapp/dist/js /webapp/dist/css

# Create our custom files in a single layer to reduce build time
RUN touch /webapp/js/sticky-notes.js \
    /webapp/js/board-controller.js \
    /webapp/css/notes-styles.css \
    /webapp/css/board-view.css \
    /webapp/css/themes.css

# Copy our custom files in a single step to reduce layers
COPY webapp/js/sticky-notes.js webapp/js/board-controller.js /webapp/js/
COPY webapp/css/notes-styles.css webapp/css/board-view.css webapp/css/themes.css /webapp/css/

# Also copy them to the dist directory to ensure they're included (in one command)
RUN cp -f /webapp/js/sticky-notes.js /webapp/js/board-controller.js /webapp/dist/js/ || true && \
    cp -f /webapp/css/notes-styles.css /webapp/css/board-view.css /webapp/css/themes.css /webapp/dist/css/ || true

# Run the frontend build
RUN make clean-frontend frontend

# Make sure our custom files are still in the dist directory after build (in one command)
RUN cp -f /webapp/js/sticky-notes.js /webapp/js/board-controller.js /webapp/dist/js/ || true && \
    cp -f /webapp/css/notes-styles.css /webapp/css/board-view.css /webapp/css/themes.css /webapp/dist/css/ || true

##################################################################################
FROM --platform=$BUILDPLATFORM golang:1-alpine AS plik-builder

# Install only needed packages for build - alpine version is much smaller and faster
RUN apk add --no-cache git make build-base

# Prepare the source location
RUN mkdir -p /go/src/github.com/root-gg/plik
WORKDIR /go/src/github.com/root-gg/plik

# Copy webapp build from previous stage
COPY --from=plik-frontend-builder /webapp/dist webapp/dist

# Add the source code (see .dockerignore)
COPY . .

# Skip git operations for faster builds
# Just generate the build info directly
RUN mkdir -p server/bin && \
    echo 'package main\n\nconst (\n  BuildInfo = "Custom build"\n  BuildDate = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"\n)' > server/common/buildinfo.go

# Skip the releaser and compile directly 
RUN cd server && go build -o plikd && \
    cd ../client && go build -o plik

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

# Create the directory structure
RUN mkdir -p /home/plik/server /home/plik/webapp /home/plik/client

# Copy only what's needed from the builder
COPY --from=plik-builder --chown=1000:1000 /go/src/github.com/root-gg/plik/server/plikd /home/plik/server/
COPY --from=plik-builder --chown=1000:1000 /go/src/github.com/root-gg/plik/client/plik /home/plik/client/
COPY --from=plik-builder --chown=1000:1000 /go/src/github.com/root-gg/plik/webapp/dist /home/plik/webapp/

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

EXPOSE 8080 8081
USER plik
WORKDIR /home/plik
CMD ["./start.sh"]
