# RCON: authenticated TCP administration

Use Open77 RCON to build a hosting panel, dashboard, bot or command-line tool that
controls a dedicated server. It exposes Warden's administrative operations over a
separate TCP connection: players, console, resources, configuration, permissions,
Workshop jobs, live logs and performance captures.

This page describes **Open77 RCON protocol v1**. Use a server build that supports
the `rcon` configuration section. The protocol borrows the authenticated,
persistent TCP session model from Minecraft RCON, but uses its own wire format.
Minecraft/Source RCON clients such as `mcrcon` are not compatible.

## Enable RCON

Complete [server setup](/docs/host-a-server) first. Add this root section to
`server.jsonc` and restart the server:

```json
"rcon": {
  "enabled": true,
  "bindAddress": "127.0.0.1",
  "port": 11782,
  "passwordEnvironmentVariable": "OP77_RCON_PASSWORD",
  "permissions": ["*"]
}
```

Set `OP77_RCON_PASSWORD` in the server process environment to a randomly generated
secret of 16–1024 characters. Inject it through your hosting panel's secret store
or a protected service environment file. Do not put it in JSON, Git, a URL or a
command-line argument.

RCON is disabled by default. Its default TCP port is `11782`, separate from the
game's UDP port and resource downloads. `warden.enabled` can remain `false`: the
shared administration backend runs without opening Warden's HTTP listener.

The server package's `tools/rcon/client.mjs` and `tools/rcon/cli.mjs` provide a
dependency-free Node.js client. With Node.js **22 or later** and the password set
in your shell environment:

```bash
node tools/rcon/cli.mjs command status
node tools/rcon/cli.mjs request GET /api/dashboard
node tools/rcon/cli.mjs discover
node tools/rcon/cli.mjs logs
```

## Connect remotely

For a dashboard on another machine, keep the listener on loopback and use an SSH
tunnel, or enable TLS on a remote bind address.

```bash
ssh -N -L 11782:127.0.0.1:11782 operator@your-server
```

For direct TLS connections:

```json
"rcon": {
  "enabled": true,
  "bindAddress": "0.0.0.0",
  "port": 11782,
  "tlsCertificateFile": "private/rcon.pfx",
  "tlsCertificatePasswordEnvironmentVariable": "OP77_RCON_CERT_PASSWORD",
  "permissions": ["dashboard.view", "players.view", "console.view"]
}
```

The PFX/PKCS#12 file must contain a private key. Relative paths resolve against the
configuration directory. Supply its password through the named environment
variable. TLS starts immediately on connection; there is no STARTTLS exchange.
TLS 1.2 and 1.3 are supported. Clients must trust the certificate and verify its
hostname. Restrict the port in your firewall to the dashboard hosts.

Plaintext non-loopback listeners require explicit `allowInsecureRemote:true`.
Use that option only behind a trusted encrypted tunnel or on an isolated network:
the password and administrative data otherwise travel unencrypted. Authentication
and permissions remain enforced.

The CLI accepts `OP77_RCON_HOST`, `OP77_RCON_PORT`, `OP77_RCON_USERNAME`,
`OP77_RCON_TLS=1`, `OP77_RCON_CA_FILE` and `OP77_RCON_TLS_NAME`. Use a PEM CA file
for private PKI instead of disabling certificate verification.

## Authentication and permissions

Omit `username` in the authentication frame to use `$service`. This identity gets
the permissions listed in `rcon.permissions`.

Set `allowWardenAccounts:true` to also accept existing Warden operator usernames
and passwords. These are server-local Warden accounts, not website accounts,
master API keys or in-game ACL identities. Named accounts keep their Warden role;
the service permission list does not replace it. You can omit the service password
only when named accounts are enabled and at least one operator already exists.

Operations use the same permission checks, validation, confirmations and audit as
Warden. Audit attribution is `rcon:<username>` or `rcon:$service`. Passwords and
session tokens are not included in authentication logs. Console commands and
administrative details remain auditable; do not include secrets in command text.

Deleting an account invalidates its existing connection, even if the name is
recreated. Role/permission changes close active sessions within one second.
Queued game-loop work checks authority again before execution. Reauthenticate
after changing roles. Changing the service password requires a server restart.

`*`, console execution, resource upload and account management are powerful
administrative capabilities. Give each integration only the permissions it needs.
For example, a read-only panel can use `dashboard.view` and `players.view`.

## Configuration reference

All fields are under `rcon` and take effect at server startup.

| Field | Default | Purpose / range |
| --- | --- | --- |
| `enabled` | `false` | Enable the listener. |
| `bindAddress` | `127.0.0.1` | IPv4/IPv6 literal, not a hostname. |
| `port` | `11782` | TCP port, 1–65535. |
| `passwordEnvironmentVariable` | `OP77_RCON_PASSWORD` | Name of the environment variable holding the service password. |
| `allowWardenAccounts` | `false` | Allow existing named Warden operators. |
| `permissions` | `["*"]` | Service permissions, up to 128 names. `[]` grants no administrative operations. |
| `allowInsecureRemote` | `false` | Explicitly allow plaintext non-loopback TCP. |
| `tlsCertificateFile` | `null` | PFX file with private key. |
| `tlsCertificatePasswordEnvironmentVariable` | `OP77_RCON_CERT_PASSWORD` | Variable holding the PFX password; optional for an unencrypted PFX. |
| `maxConnections` | `32` | Concurrent sockets, authenticated or not; 1–256. |
| `maxConnectionsPerIp` | `8` | Per-source-IP sockets; 1–`maxConnections`. |
| `maxFrameBytes` | `1048576` | Authenticated incoming JSON payload cap; 65536–4194304 bytes. |
| `maxInFlightRequests` | `8` | Active commands/requests per connection, including log streams; 1–32. |
| `maxRequestsPerSecond` | `30` | Client operations per second, including pings and upload chunks; 1–1000. |
| `authenticationTimeoutSeconds` | `10` | TLS handshake and authentication deadline; 1–60. |
| `requestTimeoutSeconds` | `60` | Cooperative deadline for ordinary operations; 1–600. |
| `idleTimeoutSeconds` | `600` | Deadline for the next complete client frame; 10–86400. |
| `sessionLifetimeSeconds` | `3600` | Absolute session lifetime, including reconnects; 10–86400. |
| `maxUploadBytes` | `67108864` | One staged upload per connection; 1–1073741824 bytes. Endpoint body caps still apply. |

[Startup overrides](/docs/server-startup) work for this section:

```bash
./Open77.Server --rcon.enabled=true --rcon.port=12782
```

Equivalent environment overrides include `OP77_CONFIG__RCON__ENABLED=true` and
`OP77_CONFIG__RCON__PORT=12782`. CLI values override environment configuration,
which overrides the file. `OP77_RCON_PASSWORD` is a credential, not a configuration
override. `--check-config` validates fields and transport policy without listening;
credentials, certificate availability and port binding are checked at startup.

## Build a dashboard backend

Browser JavaScript cannot open a raw TCP socket. Connect from your backend and
keep credentials and resume tokens there. Your web API still needs authentication,
authorization, CSRF protection and an allowlist of actions. Do not expose an
unrestricted HTTP-to-RCON proxy to players.

```js
import { RconClient } from './tools/rcon/client.mjs';

const rcon = await RconClient.connect({
  host: '127.0.0.1',
  port: 11782,
  password: process.env.OP77_RCON_PASSWORD,
});

try {
  const dashboard = await rcon.json('GET', '/api/dashboard');
  const players = await rcon.json('GET', '/api/players');
  console.log({ dashboard, players });

  await rcon.json('POST', '/api/announce', {
    reason: 'Restart in five minutes.',
  });
} finally {
  rcon.close();
}
```

For TLS, pass `tls:{ca, servername}` to `connect()`; `ca` is PEM data, not a path.
Omit `ca` to use system trust. The helper refuses `rejectUnauthorized:false`.

`request()` and `command()` return `{status, contentType, headers, bytes, body,
json?}`. `json()` additionally throws for error statuses and `ok:false`.
Protocol errors throw `RconError` with a `code`. The helper handles framing,
correlation, request pacing and heartbeats; it does not automatically reconnect
or replay mutations.

## TCP framing

Every frame contains:

| Bytes | Value |
| --- | --- |
| 0–3 | Unsigned 32-bit **big-endian** JSON payload byte length. |
| 4 onward | One UTF-8 JSON object of exactly that length. |

The length excludes the prefix. Do not append a NUL, newline, BOM or other
terminator. TCP reads may contain partial frames or multiple frames; buffer by
length, not by socket-read boundaries. JSON names and operation names are
case-sensitive. Nested JSON is limited to 32 levels; duplicate properties and
malformed/oversized frames close the connection. Before authentication, the
payload cap is 16384 bytes.

The server sends a greeting before expecting credentials:

```json
{"id":0,"type":"hello","protocol":"open77-rcon","version":1,"maxFrameBytes":1048576,"maxInFlightRequests":8,"maxUploadBytes":67108864,"maxRequestsPerSecond":30,"idleTimeoutSeconds":600}
```

Client request IDs are positive integers up to `9007199254740991`, strictly
increasing within one connection. Responses for different IDs can interleave;
frames for a given ID stay ordered. IDs reset after reconnect and are not durable
idempotency keys.

### Authenticate

```json
{"id":1,"op":"auth","version":1,"password":"<your secret>"}
```

Optional fields are `username` and `sessionToken`. Success returns:

```json
{"id":1,"type":"result","ok":true,"username":"$service","permissions":["*"],"sessionToken":"rcon:<opaque token>","expiresAtUtc":"2026-09-23T18:00:00+00:00"}
```

### Operations

| `op` | Required fields | Response |
| --- | --- | --- |
| `ping` | None | `result` with `ok:true`. |
| `discover` | None | `result` with `protocol` and `operations:[{method,path},…]`. |
| `command` | `command` | Streamed console-command result. |
| `request` | `method`, `path` | Streamed administrative result; optional JSON `body` **or** `uploadId`, and `contentType`. |
| `cancel` | `requestId` | `result` with `cancelled` and the target ID. |
| `upload.begin` | `bytes`, hexadecimal `sha256` | `result` with `uploadId`. |
| `upload.chunk` | `uploadId`, byte `offset`, base64 `data` | `result` with cumulative `bytes`. |
| `upload.finish` | `uploadId` | `result` with `ready:true` after verification. |
| `upload.abort` | `uploadId` | `result` with `ok:true`. |

Request methods are `GET`, `POST`, `PUT`, `PATCH` and `DELETE`. The path is a
relative `/api/...` target with optional query string, not an external URL.
`contentType` defaults to `application/json`. Arbitrary cookies, authorization
headers and origin headers are not accepted.

```json
{"id":2,"op":"request","method":"GET","path":"/api/players"}
{"id":3,"op":"command","command":"status"}
{"id":4,"op":"request","method":"POST","path":"/api/restart","body":{"delaySeconds":60,"reason":"Maintenance"}}
```

### Read a response

Administrative requests return metadata, zero or more body chunks, and a terminal
frame. This example's base64 data decodes to `[]`:

```json
{"id":2,"type":"response","status":200,"contentType":"application/json; charset=utf-8","headers":{}}
{"id":2,"type":"data","data":"W10="}
{"id":2,"type":"end","complete":true,"bytes":2,"error":null}
```

Decode and concatenate bytes before decoding UTF-8 or parsing JSON: a character
can span chunks. Each data chunk contains at most 32768 decoded bytes. `bytes`
counts all decoded body bytes. Selected headers preserve download metadata:
`Content-Disposition`, `Content-Range`, `ETag` and `Retry-After`.

`complete:true` means processing finished, not that the operation succeeded.
Check `status` and the body's `ok`, `error` or job state. A 202 means an accepted
asynchronous job; poll it. A 200 with `ok:false` is an application refusal.
`complete:false` or EOF without a terminal frame is not success, even if the
initial status was 200.

Protocol-level refusals can instead return:

```json
{"id":5,"type":"error","error":{"code":"busy","message":"The session already has the maximum number of active requests."}}
```

## Administrative endpoints

Use `discover` to read the actual route catalogue of the connected server build.
Replace placeholders such as `{id:guid}` with values and URL-encode path segments.
Discovery does not grant permission or guarantee that a subsystem is ready.

| Area | Endpoint examples | Permissions |
| --- | --- | --- |
| Server status | `GET /api/dashboard` | `dashboard.view` |
| Players | `GET /api/players`; `POST /api/players/{id}/kick`, `/ban`, `/warn`, `/heal`, `/freeze`, `/unfreeze`, `/teleport`, `/bring` | `players.view` and the corresponding action permission. |
| Announcements/restarts | `POST /api/announce`; `POST`/`DELETE /api/restart` | `announce.send`, `restart.schedule` |
| Resources | `/api/resources`, `/api/resources/{name}/{action}`, `/validate`, `/files` | `resources.view`, `resources.control`, `resources.upload` |
| Console/logs | `/api/console/command`, `/api/console/log`, `/api/console/stream` | `console.execute`, `console.view` |
| Configuration/branding | `/api/config`, `/api/config/icon`, `/api/config/banner` | `config.view`, `config.edit` |
| In-game ACL | `/api/acl`, `/api/acl/roles`, `/api/acl/identities` | `acl.view`, `acl.edit`; grant restrictions still apply. |
| Whitelist/bans | `/api/access`, `/api/access/whitelist`, `/api/access/bans/{userId}` | `access.view`, `access.edit` |
| Tunables | `/api/tunables`, `/api/tunables/{resource}/keys/{key}`, `/promote` | `tunables.view`, `tunables.edit` |
| Required mods | `/api/mods`, `/api/mods/inspect`, mod removal/review routes | `mods.manage` |
| Operator accounts | `/api/users`, `/api/users/{name}/role`, `/api/roles` | `users.manage` |
| Audit | `GET /api/audit` | `audit.view` |
| Workshop | `/api/hub/*`: catalogue, plans, jobs, installs, rollback, retention, exports and publishing | `hub.view`, `hub.manage`, `hub.publish` |
| Performance | `/api/performance/*`: live metrics, capture control and ZIP exports | `performance.view`, `performance.control` |
| Full reset | `POST /api/reset/arm`, `POST /api/reset` | `server.reset`, plus console PIN and typed-name confirmation. |

The request bodies and results are Warden's contracts. For example:

```js
await rcon.json('POST', '/api/players/7/kick', { reason: 'AFK' });
await rcon.json('POST', '/api/resources/my_resource/restart', {});
await rcon.json('POST', '/api/access/whitelist', { enabled: true });
await rcon.json('POST', '/api/config', { name: 'My server', maximumPlayers: 32 });
await rcon.json('POST', '/api/tunables/my_resource/keys/speed', { value: 5 });
```

RCON does not provide arbitrary shell access. Editable configuration fields,
restart requirements and destructive-operation confirmations remain the same as
Warden. Browser login/setup, provisioning, HTML and `/health` are not RCON
operations. A stopped process cannot receive commands; restarting it requires your
hosting supervisor or service manager.

## Live logs and file transfers

`GET /api/console/stream?after=<last-seq>` returns UTF-8 SSE inside data frames:
`data: {log JSON}\n\n`. Parse across chunk boundaries. Logs contain `seq`, `ts`,
`level` and `message`. The recent/live feed is bounded, so sequence gaps can occur
under load. Keep sending periodic pings even when only receiving logs.

```js
const subscription = rcon.logs(entry => console.log(entry.message));
// Later, when this view closes:
await subscription.cancel();
await subscription.result;
```

The helper awaits log/data callbacks for backpressure. Do not await another
request on the same connection inside one of those callbacks. Use a separate
connection if slow log consumers must not delay administrative commands.

Uploads are connection-owned and limited to one staged file at a time. Declare
size/hash, append ordered chunks at the next exact offset, then finish. A verified
upload can replace the body of one request; it cannot select an arbitrary server
path. Abort or disconnect removes its temporary file.

```js
const uploadId = await rcon.uploadFile('./vehicle-pack.zip');
const inspection = await rcon.call('request', {
  method: 'POST',
  path: '/api/mods/inspect?fileName=vehicle-pack.zip',
  uploadId,
  contentType: 'application/octet-stream',
});
console.log(inspection.status, inspection.json);
```

Inspection does not install the mod. Re-upload for a second operation. Endpoint
body limits remain enforced: ordinary admin bodies are capped at 4 MiB and
required-mod archive bodies at 64 MiB, even if `maxUploadBytes` is higher.

For large downloads, pass `onResponse` and `onData` to `request()`. Check status
before writing, await file writes for backpressure, and promote the temporary file
only after the result completes. Without a streaming callback, the helper buffers
at most 16 MiB by default; `maxResponseBytes` can change that local limit.

## Session recovery and cancellation

Reconnect with both credentials and the previous `sessionToken` to recover
Workshop plan/job/export ownership. Tokens are identity-bound, expire at
`expiresAtUtc` and do not survive a server restart. Resuming does not extend the
original expiry, recover unfinished command results, or restore uploads/log
subscriptions. Keep tokens in backend memory or protected storage.

Cancellation prevents queued game-loop work from beginning but cannot undo an
operation already committed. An accepted Workshop job has its own lifetime:
cancelling its request or disconnecting does not cancel the job. Use the job's
explicit cancellation endpoint and poll its state after reconnecting.

After a timeout or lost connection, inspect current state before retrying a
mutation. Do not automatically replay install, publish, grant, reset or player
actions. The client helper's `start()` returns `{id, result, cancel}` when you need
explicit request cancellation.

## Errors and troubleshooting

| Code / symptom | What to check |
| --- | --- |
| Connection refused | Listener enabled, TCP port, bind address, firewall, connection cap and auth cooldown. |
| `authentication_required` | Send an `auth` frame first. |
| `authentication_failed` | Credentials, named-account opt-in, and cooldown. |
| `unsupported_version` | Connect using Open77 RCON v1, not Minecraft/Source framing. |
| `session_unavailable` | Token expired, belongs to another identity, or retained-session capacity reached. |
| `session_revoked` | Operator was removed or lost authority; reauthenticate with current rights. |
| `busy` | Too many active requests on this connection; long-lived log streams count. |
| `rate_limited` | Reduce polling/upload frame rate before reconnecting. |
| `invalid_request` | Operation name, field types, path, upload offset/hash/state, or conflicting bodies. |
| `payload_too_large` | Transport upload limit or the target endpoint's body cap. |
| `cancelled_or_timed_out` | Check current server/job state before retrying. |
| `operation_failed` | Server diagnostics and subsystem state. |
| 403 with a permission name | The authenticated role lacks that operation's permission. |
| TLS failure | PFX private key, trusted certificate chain, hostname and matching TLS configuration. |

Five failed password attempts from one IP cause a five-minute cooldown. Slow
readers have a 15-second write deadline. Malformed frames, exhausted connection
limits and expired deadlines can close the socket without an error frame.

Startup logs identify the RCON bind address and TLS mode. Warden's audit remains
available through `GET /api/audit` and `.open77/warden/audit.jsonl`. Debug logs show
connection error types without echoing credentials or raw protocol payloads.

Related guides: [Warden](/docs/warden), [player administration](/docs/warden-players),
[Workshop administration](/docs/community-hub-warden),
[connection control](/docs/connection-control), [permissions](/docs/server-acl),
[Prometheus metrics](/docs/metrics), and [startup arguments and logging](/docs/server-startup).
