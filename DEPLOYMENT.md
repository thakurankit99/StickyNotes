# StickyNotes Deployment Guide

This guide will help you deploy the StickyNotes application correctly and fix common issues.

## Common Deployment Issues

Based on the console errors, there are some issues with serving JavaScript and CSS files with the correct MIME types. Here's how to fix them:

### File Not Found Errors

If you're seeing 404 errors for files like:
- `/js/sticky-notes.js`
- `/js/board-controller.js`
- `/css/board-view.css`
- `/css/notes-styles.css`

Make sure these files are included in your build process and are being copied to the correct location in your deployment directory.

### MIME Type Errors

If you're seeing errors like:
```
Refused to apply style from 'https://stickynotes-imi8.onrender.com/css/board-view.css' because its MIME type ('text/plain') is not a supported stylesheet MIME type, and strict MIME checking is enabled.
```

This is because your server is not setting the correct MIME type for CSS and JavaScript files. The solution depends on your hosting platform:

#### For Nginx

Add these lines to your Nginx configuration:

```nginx
server {
    # ... other config ...
    
    # Proper MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    location ~* \.(js)$ {
        types { application/javascript js; }
    }
    
    location ~* \.(css)$ {
        types { text/css css; }
    }
    
    # ... other config ...
}
```

#### For Apache

Make sure your `.htaccess` file includes:

```apache
AddType application/javascript .js
AddType text/css .css
```

#### For Express.js

If you're using Express.js, make sure you're serving static files correctly:

```javascript
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));
```

### For Render.com

If you're deploying on Render.com as indicated by your URL, you'll need to:

1. Create a `render.yaml` file in your project root with the following content:

```yaml
services:
  - type: web
    name: stickynotes
    env: static
    buildCommand: your-build-command-here
    staticPublishPath: ./webapp
    headers:
      - path: "/*.js"
        name: "Content-Type"
        value: "application/javascript"
      - path: "/*.css"
        name: "Content-Type"
        value: "text/css"
```

2. Redeploy your application

## Testing Locally

To test your application locally and ensure files are served with the correct MIME types:

```bash
# Using Python's built-in HTTP server
cd webapp
python -m http.server 8000
```

Or for Python 2:
```bash
cd webapp
python -m SimpleHTTPServer 8000
```

This should serve your files with the correct MIME types for local testing.

## Verifying Fixed Deployment

After making these changes, refresh your application and check the browser console. The 404 and MIME type errors should be resolved.

If you're still experiencing issues, please check your server logs for more detailed error information. 