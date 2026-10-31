# HTTP requests from Lua

Call web APIs, webhooks and file hosts from server Lua with `Open77.http`: every HTTP method,
JSON, form and multipart bodies, binary data, query parameters, authentication, redirects,
timeouts, cancellation, uploads from files and downloads to files.

Requests leave the server tick at once. The exchange runs in the background and its result comes
back on the resource's own scheduler, so a slow API never delays the game loop and callbacks can
use the rest of the resource's state safely.

HTTP requests are server-only. Clients cannot call `Open77.http`, and players never see the
URLs, headers or tokens a resource uses.

## Prerequisites

1. The resource declares `http.request`:

   ```lua
   resource "race_results"
   version "1.0.0"
   server_script "server/main.lua"

   permissions { "http.request" }
   ```

2. The server operator enables outbound HTTP and lists the destinations in `server.jsonc`
   ([operator setup](#operator-setup)). Without it every request fails with
   `http_unavailable` or `host_not_allowed`.

Uploading a file also needs `filesystem.read`; saving a response to a file needs
`filesystem.write`.

## Quick start

```lua
CreateThread(function()
    local response, err = Open77.http.post.await("https://discord.com/api/webhooks/ID/TOKEN", {
        json = { content = "Heat 3 finished: V wins in 2:41.330", username = "Night City Racing" },
    })
    if not response then
        return print("webhook failed: " .. err)
    end
    if not response.ok then
        return print(("webhook refused: %d %s"):format(response.status, response.body))
    end
    print("webhook delivered")
end)
```

## Calling forms

Every request function has two forms.

```lua
-- Callback: returns the request id (or false, reason) immediately.
local id = Open77.http.get("https://api.example.com/status", function(response, err)
    if not response then return print("failed: " .. err) end
    print(response.status, response.json and response.json.state)
end)

-- Await: from CreateThread, a command or an event handler.
local response, err = Open77.http.get.await("https://api.example.com/status")
```

| Outcome | Callback | `.await` |
| --- | --- | --- |
| The server answered (any status, including 404 and 500) | `callback(response, nil)` | returns `response` |
| The exchange did not complete (timeout, DNS, refused, cancelled) | `callback(nil, reason)` | returns `nil, reason` |

`.await` never raises for a failed request. Check `response.ok` for a 2xx status. Options passed
to a call are never modified.

## Functions

| Function | Request |
| --- | --- |
| `Open77.http.get(url, options?, callback?)` | `GET` |
| `Open77.http.post(url, options?, callback?)` | `POST` |
| `Open77.http.put(url, options?, callback?)` | `PUT` |
| `Open77.http.patch(url, options?, callback?)` | `PATCH` |
| `Open77.http.delete(url, options?, callback?)` | `DELETE` |
| `Open77.http.head(url, options?, callback?)` | `HEAD` |
| `Open77.http.options(url, options?, callback?)` | `OPTIONS` |
| `Open77.http.request(options, callback?)` | Any method; `options.url` is required. |
| `Open77.http.upload(url, parts, options?, callback?)` | `multipart/form-data`, `POST` unless `options.method` says otherwise. |
| `Open77.http.download(url, path, options?, callback?)` | `GET`; the body is written to `data/<path>`. |
| `Open77.http.cancel(id)` | Cancels a request started with a callback. |

Each request function has `.await` with the same arguments minus the callback, for example
`Open77.http.get.await(url, options?)`.

## Request options

| Option | Type | Description |
| --- | --- | --- |
| `url` | string | Absolute `http://` or `https://` URL without credentials. Set by the verb functions. |
| `method` | string | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` or `OPTIONS`, in any case. Default `GET`, or `POST` when a body is given. |
| `query` | table or string | Appended to the URL. `{ page = 2, tag = { "a", "b" } }` becomes `page=2&tag=a&tag=b`; keys are sorted. |
| `headers` | table | `{ ["X-Name"] = "value" }`; values may be strings, numbers or booleans. |
| `auth` | table | `{ bearer = token }`, or `{ username = ..., password = ... }` for Basic. Sets `Authorization`. |
| `body` | string | Raw body, binary-safe. Default `Content-Type` is `text/plain; charset=utf-8`. |
| `json` | any | Encoded as JSON with `Content-Type: application/json; charset=utf-8`. |
| `form` | table | `application/x-www-form-urlencoded`, encoded like `query`. |
| `multipart` | array | Form parts; see [Uploads](#uploads). |
| `file` | string | Streams `data/<path>` as the body. `Content-Type` follows the extension. Needs `filesystem.read`. |
| `contentType` | string | Overrides the body's `Content-Type`. |
| `timeout` | number | Milliseconds. Default and ceiling are set by the operator (10 s and 120 s by default). |
| `followRedirects` | boolean | Follow 301, 302, 303, 307 and 308 responses. Default `false`. |
| `maxRedirects` | integer | `0`–`10`, default `5`. |
| `maxBytes` | integer | A lower size limit for this response. |
| `responseType` | string | `"auto"` (default), `"text"`, `"json"` or `"base64"`; see [Responses](#responses). |
| `saveTo` | string | Write the body to `data/<path>` instead of memory. Needs `filesystem.write`. |

A request takes at most one of `body`, `json`, `form`, `multipart` and `file`; a second one fails
with `conflicting_body`. An unknown option, or a value of the wrong type, fails with
`invalid_option:<name>`.

The transport sets these headers itself and refuses them with `forbidden_header:<name>`: `Host`,
`Content-Length`, `Transfer-Encoding`, `Connection`, `Upgrade`, `Keep-Alive`, `TE`, `Trailer` and
`Expect`. A request without `User-Agent` sends `Open77-Server (<resource name>)`. Compressed
responses (gzip, deflate, brotli) are decompressed automatically.

## Responses

| Field | Description |
| --- | --- |
| `status` | HTTP status code. |
| `ok` | `true` for 200–299. |
| `statusText` | Reason phrase, for example `"Not Found"`. |
| `headers` | Header names in lower case; repeated headers joined with `", "`. |
| `contentType` | The `Content-Type` header, or `""`. |
| `body` | The body as a Lua string of raw bytes (binary-safe). Base64 text with `responseType = "base64"`; `""` when saved to a file. |
| `json` | The decoded body when `responseType` is `"json"`, or `"auto"` and the response is JSON. |
| `jsonError` | `"invalid_json"` when such a body cannot be decoded; the response is still delivered. |
| `url` | Final URL after redirects. |
| `redirected`, `redirects` | Whether redirects were followed, and how many. |
| `bytes` | Body size received, after decompression. |
| `durationMs` | Time from sending to the last byte. |
| `file` | The `data/` path written by `saveTo` or `download`. |
| `id` | The request id. |

## Examples

### Authenticated JSON API

```lua
local GITHUB_TOKEN = GetConvar("race_results_github_token", "")

local function latestRelease(repository)
    local response, err = Open77.http.get.await("https://api.github.com/repos/" .. repository .. "/releases/latest", {
        auth = { bearer = GITHUB_TOKEN },
        headers = { Accept = "application/vnd.github+json" },
    })
    if not response then return nil, err end
    if not response.ok then return nil, ("github answered %d"):format(response.status) end
    return response.json.tag_name
end
```

Keep tokens out of the resource's files: read them from a convar or another secret the operator
provides.

### Query parameters and pagination

```lua
local function allPages(url)
    local items, page = {}, 1
    while true do
        local response, err = Open77.http.get.await(url, { query = { page = page, per_page = 100 } })
        if not response or not response.ok then return nil, err or response.status end
        for _, item in ipairs(response.json) do items[#items + 1] = item end
        if #response.json < 100 then return items end
        page = page + 1
    end
end
```

### Retry with backoff

```lua
local function postWithRetry(url, options, attempts)
    local delay = 500
    for attempt = 1, attempts do
        local response, err = Open77.http.post.await(url, options)
        if response and (response.ok or response.status < 500) then return response end
        if attempt == attempts then return response, err end
        Wait(delay)
        delay = delay * 2
    end
end
```

Retry only on transport errors and 5xx statuses; a 4xx response will not change on retry.

### Form login and cookies

```lua
local login = Open77.http.post.await("https://panel.example.com/login", {
    form = { user = "bot", password = GetConvar("panel_password", "") },
})
local cookie = login and login.headers["set-cookie"]
local stats = Open77.http.get.await("https://panel.example.com/stats", {
    headers = { Cookie = cookie and cookie:match("^[^;]+") },
})
```

The client keeps no cookie jar: read `Set-Cookie` and send `Cookie` explicitly.

## Uploads

`Open77.http.upload(url, parts, options?, callback?)` sends `multipart/form-data`. Each part has a
`name` and exactly one source.

| Part field | Description |
| --- | --- |
| `name` | Form field name. Required. |
| `value` | Text field. |
| `data` | Bytes from a Lua string, binary-safe. |
| `file` | `data/<path>`, streamed. Needs `filesystem.read`. `filename` defaults to the file's name. |
| `json` | Any value, encoded as JSON (`application/json`). |
| `filename` | Makes the part a file upload. |
| `contentType` | The part's `Content-Type`. File parts default to their extension's type. |

```lua
local response, err = Open77.http.upload.await("https://uploads.example.com/v1/files", {
    { name = "title", value = "Race results" },
    { name = "results", file = "results/race-42.csv" },
    { name = "thumbnail", filename = "thumb.png", contentType = "image/png", data = pngBytes },
    { name = "meta", json = { race = 42, laps = 3 } },
}, { auth = { bearer = token } })
```

A request holds at most 64 parts, and all bodies together stay within the operator's
`maxRequestBytes` (8 MiB by default). To send one raw file as the whole body, use
`Open77.http.put.await(url, { file = "exports/world.zip" })`.

## Downloads

```lua
local response, err = Open77.http.download.await("https://cdn.example.com/maps/city.json", "maps/city.json")
if response and response.ok then
    print(("saved %d bytes to %s"):format(response.bytes, response.file))
end
```

The body is written to a temporary file next to the destination and renamed when complete, so a
failed, cancelled or oversized download never leaves a truncated file. Downloads are limited by
the operator's `maxDownloadBytes` (64 MiB by default). A response with an error status is saved
too: check `response.ok`.

## Redirects

Redirects are not followed unless the request sets `followRedirects = true`. Then:

- each new host must be on the operator's list, or the request fails with
  `redirect_host_not_allowed`;
- a redirect from `https` to `http` fails with `redirect_downgrade`;
- `Authorization` and `Cookie` are removed when the scheme, host or port changes;
- 303, and 301 or 302 after a `POST`, continue as `GET` without the body; 307 and 308 repeat the
  method and the body;
- more than `maxRedirects` hops fails with `too_many_redirects`.

## Cancellation and concurrency

The callback form returns the request id. `Open77.http.cancel(id)` stops the request, and its
callback receives `(nil, "cancelled")`. It returns `false` when the request has already finished.

```lua
local id = Open77.http.get("https://api.example.com/slow-report", function(response, err)
    print(err or response.status)
end)
SetTimeout(2000, function() Open77.http.cancel(id) end)
```

A resource has at most 16 requests in flight by default (`too_many_requests`). Stopping or
reloading the resource cancels its requests, and their callbacks do not run.

## Helpers

| Function | Result |
| --- | --- |
| `Open77.http.encodeQuery(table)` | `a=1&b=x%20y`, keys sorted, arrays repeated. |
| `Open77.http.parseQuery(text)` | A table from a query string; a leading URL and `?` are ignored. |
| `Open77.http.urlEncode(text)`, `Open77.http.urlDecode(text)` | Percent-encoding of one component. |
| `Open77.http.base64Encode(bytes)`, `Open77.http.base64Decode(text)` | Base64; URL-safe input is accepted. Decoding invalid text returns `nil, "invalid_base64"`. |
| `Open77.http.isAllowed(urlOrHost)` | Whether the operator's list allows the destination. |
| `Open77.http.limits()` | `{ allowedHosts, timeoutMs, maxTimeoutMs, maxRequestBytes, maxResponseBytes, maxDownloadBytes, maxInFlight, inFlight, maxRedirects }` |

## Operator setup

```jsonc
"http": {
  "enabled": true,
  "allowedHosts": ["discord.com", "*.example.com", "api.internal.lan"],
  "timeoutSeconds": 10,
  "maxTimeoutSeconds": 120,
  "maxResponseBytes": 1048576,
  "maxRequestBytes": 8388608,
  "maxDownloadBytes": 67108864,
  "maxConcurrentRequests": 16
}
```

| Key | Default | Description |
| --- | --- | --- |
| `enabled` | `false` | Turns outbound HTTP on. |
| `allowedHosts` | `[]` | Destinations; an empty list reaches nothing. |
| `timeoutSeconds` | `10` | Default timeout of a request (1–60). |
| `maxTimeoutSeconds` | `120` | Ceiling on a request's `timeout` option. |
| `maxResponseBytes` | 1 MiB | Body returned to Lua. |
| `maxRequestBytes` | 8 MiB | Request body, uploads included. |
| `maxDownloadBytes` | 64 MiB | Body written to a file. |
| `maxConcurrentRequests` | `16` | Requests one resource may have in flight. |

| `allowedHosts` entry | Matches |
| --- | --- |
| `discord.com` | That host only. |
| `*.example.com` | `example.com` and one level of subdomain (`api.example.com`, not `a.b.example.com`). |
| `*` | Any host on the public internet. |

With `*`, a destination must resolve to a public address: loopback, private networks, CGNAT,
link-local addresses (including the cloud metadata address `169.254.169.254`) and multicast are
refused after DNS resolution with `address_not_allowed`, so a public name pointing inward is
refused too. A host listed explicitly may resolve to any address; list `api.internal.lan` or
`127.0.0.1` to let resources reach a local service.

## Errors

Refusals happen before anything is sent; the callback form also calls the callback with
`(nil, reason)`.

| Reason | Cause |
| --- | --- |
| `permission_denied:http.request` | The manifest lacks `http.request` (or `filesystem.read` / `filesystem.write` for files). |
| `http_unavailable` | Outbound HTTP is not enabled on this server. |
| `invalid_url` | Not an absolute `http`/`https` URL, credentials in it, or longer than 8 KiB. |
| `host_not_allowed` | The host is not on the operator's list. |
| `invalid_method` | Not one of the seven methods. |
| `invalid_option:<name>` | Unknown option, or a value of the wrong type or range. |
| `conflicting_body` | More than one body option. |
| `invalid_header`, `forbidden_header:<name>`, `too_many_headers` | Up to 64 headers of 8 KiB each, without line breaks. |
| `invalid_multipart: ...` | A part without a name or without exactly one source, or more than 64 parts. |
| `invalid_path`, `file_not_found` | A file path outside `data/`, or a missing file to upload. |
| `body_too_large` | The body exceeds `maxRequestBytes`. |
| `invalid_timeout`, `invalid_max_bytes` | Above the operator's ceilings. |
| `invalid_json: ...` | A `json` value that cannot be encoded, such as a cycle or a function. |
| `too_many_requests` | The resource already has `maxConcurrentRequests` in flight. |

When the exchange itself fails, the reason is one of `timeout`, `cancelled`, `dns_failed`,
`connection_failed`, `tls_failed`, `address_not_allowed`, `invalid_response`,
`response_too_large`, `too_many_redirects`, `redirect_host_not_allowed`, `redirect_downgrade`,
`invalid_redirect`, `file_error` or `request_failed`. Transport failures are logged on the server
at `WRN` with the host only, never the path, query or headers.

## PerformHttpRequest

The FiveM functions keep their shape on the same bridge:

```lua
PerformHttpRequest(url, function(status, body, headers, err) end, method?, body?, headers?)
local status, body, headers, err = PerformHttpRequestAwait(url, method?, body?, headers?)
```

`status` is `0` when the exchange did not complete, and `err` names the reason. A table `body` is
encoded as JSON. Bodies arrive as raw bytes, the limits above apply, and redirects are not
followed. `Open77.http.request(url, callback, ...)` with a string first argument is the same call.
