# Databricks Apps Supervisor Agent Chat

A Node.js + React chat app for Databricks Apps that calls a Databricks model serving endpoint for a supervisor agent. The backend uses Databricks Apps user authorization by reading the forwarded signed-in user token from `x-forwarded-access-token` and sending it directly to the serving endpoint.

The serving endpoint invocation deliberately does not use `DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET`, `DATABRICKS_TOKEN`, or Databricks SDK default authentication.

## Files

- `app.yaml` maps the Databricks Apps resource key `serving-endpoint` into `SERVING_ENDPOINT`.
- `server/index.js` exposes `/api/config` and `/api/chat`.
- `server/databricks.js` builds the endpoint payload, calls Model Serving, and parses common agent response shapes.
- `src/` contains the React chat UI.

## Deployment On Databricks Apps

1. Create or edit the Databricks App.
2. Add an app resource:
   - Resource type: Serving endpoint
   - Resource key: `serving-endpoint`
   - Permission for the app resource: Can Query
3. Enable User authorization for the app and add this scope:
   - `model-serving`
4. Confirm permissions:
   - Signed-in users must have Can Query on the serving endpoint.
   - The app resource should also have Can Query on the serving endpoint.
5. Deploy the app with this repository content.
6. After changing authorization scopes, redeploy or restart the app and have users re-consent.

`app.yaml` includes:

```yaml
env:
  - name: SERVING_ENDPOINT
    valueFrom: serving-endpoint
  - name: AGENT_REQUEST_FORMAT
    value: responses
```

Databricks Apps supplies `DATABRICKS_HOST` and the listening port at runtime. If `DATABRICKS_HOST` is provided without a scheme, the backend prepends `https://`.

## Endpoint Call

The backend calls:

```text
https://<DATABRICKS_HOST>/serving-endpoints/<SERVING_ENDPOINT>/invocations
```

The request uses the signed-in user's forwarded token:

```http
Authorization: Bearer <x-forwarded-access-token>
```

If the forwarded token is missing, `/api/chat` returns a clear error explaining that Databricks Apps user authorization must be enabled with the `model-serving` scope.

## Request Formats

Set `AGENT_REQUEST_FORMAT` in `app.yaml` or the Databricks Apps environment:

- `responses`: sends `{ "input": messages }`
- `chat`: sends `{ "messages": messages }`
- `inputs`: sends `{ "inputs": { "prompt": latestPrompt, "messages": messages } }`

The default is `responses`, matching the Databricks agent `ResponsesAgent` shape:

```json
{
  "input": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

## Response Parsing

The backend extracts display text from these common shapes:

- `output_text`
- `text`
- `content`
- `answer`
- `response`
- `prediction`
- `predictions`
- `choices[0].message.content`
- `output[].content[].text`

The UI includes a raw response expander after the first successful call.

## Local Development

Install dependencies and run the app:

```bash
npm install
npm run start
```

For local endpoint testing, set:

```bash
export DATABRICKS_HOST="https://your-workspace.cloud.databricks.com"
export SERVING_ENDPOINT="your-serving-endpoint"
export AGENT_REQUEST_FORMAT="responses"
```

When running outside Databricks Apps, browser requests will not automatically include `x-forwarded-access-token`, so `/api/chat` will return the missing user authorization error unless you proxy or send that header yourself for testing.

## References

- Databricks Apps `app.yaml` runtime configuration: https://docs.databricks.com/aws/en/dev-tools/databricks-apps/app-runtime
- Databricks Apps environment variables: https://docs.databricks.com/aws/en/dev-tools/databricks-apps/system-env
- Databricks Apps user authorization: https://docs.databricks.com/aws/en/dev-tools/databricks-apps/auth
- Databricks Apps serving endpoint resources: https://docs.databricks.com/aws/en/dev-tools/databricks-apps/model-serving
