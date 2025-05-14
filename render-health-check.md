# Render.com Health Check Configuration

Render.com provides built-in health checks for web services. This may be a more reliable option than implementing your own cron job.

## Steps to Configure Health Check on Render.com

1. Log in to your Render.com dashboard
2. Select your web service
3. Go to the "Settings" tab
4. Scroll down to "Health Check Path"
5. Enter a path that returns a 2xx response (e.g., `/health` or `/`)
6. Set the following parameters:
   - **Health Check Path**: `/` or a dedicated health endpoint if available
   - **Health Check Frequency**: Set to 290 seconds (4 minutes and 50 seconds)
   - **Health Check Timeout**: 5 seconds (or as needed)
   - **Health Check Grace Period**: As needed for your application startup

7. Click "Save Changes"

## Adding a Dedicated Health Endpoint

If you prefer to have a dedicated health endpoint, you can add one to your application by modifying your server code. 

The advantage of a dedicated endpoint is that it can perform deeper checks on your application, such as database connectivity or other internal service health.

For example, in your Go application, you already have a health endpoint that can be used:

```go
router.Handle("/health", emptyChain.Then(handlers.Health)).Methods("GET")
```

Using this dedicated health endpoint is recommended over the root path since it's specifically designed for health checks.

## Notes

- The health check will happen every 4 minutes and 50 seconds (290 seconds)
- Render will automatically restart your service if health checks fail consistently
- You can view health check logs in the "Logs" section of your Render dashboard 