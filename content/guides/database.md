# Configure a SQL database

The OPEN//77 dedicated server includes an asynchronous **MySQL/MariaDB**
bridge for server-side Lua. Use it for persistent characters, accounts,
inventories and other data your resources need to query. You do **not** install
an oxmysql resource: `MySQL` and `Open77.database` are two names for the same
built-in API. This bridge does not support PostgreSQL, SQLite or Microsoft SQL
Server.

SQL runs on the server side, never on a player's PC. The bridge is disabled
by default. The server distribution does not install a database service or
create SQL credentials for you. For a small local key/value store without a
SQL service, consider [server KVP](/docs/server-api#resource-keyvalue-store) instead.

## 1. Install MySQL or MariaDB

You can use an existing compatible service. For a new Debian/Ubuntu host,
install MariaDB from the configured distribution repositories:

```bash
sudo apt update
sudo apt install mariadb-server mariadb-client
sudo systemctl enable --now mariadb
sudo systemctl status mariadb
sudo mariadb-secure-installation
```

On Windows, use the MariaDB installer, enable the database as a Windows
service and keep its TCP port at `3306` unless another service already uses
it. For other distributions or installer details, follow the
[official MariaDB installation guide](https://mariadb.com/docs/server/mariadb-quickstart-guides/installing-mariadb-server-guide).

The simplest arrangement is SQL and OPEN//77 on the same host, with SQL
listening on loopback. Players connect to the game server, **not** to port
3306. Do not open that port to the public Internet for a local database.

## 2. Create a database and a dedicated account

Open an administrative SQL session. On a typical Debian/Ubuntu MariaDB
installation, `sudo mariadb` uses the local administrative socket. On Windows,
use the installed client or a database manager with your administrator account.

Run this once, replacing the password placeholder with a unique secret:

```sql
CREATE DATABASE open77 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'open77'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_A_UNIQUE_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX
    ON open77.* TO 'open77'@'127.0.0.1';
```

These grants allow normal reads/writes and common table migrations in this
database only. Review each resource's schema requirements: add privileges
such as `DROP` only when its reviewed migration actually requires them. Do not
give the game server the SQL administrator account or global `*.*` privileges.

SQL accounts include a host component. An account at `127.0.0.1` is not a
catch-all account for remote servers; MariaDB distinguishes TCP loopback from
`localhost` socket authentication. Keep the account host and connection method
consistent. See [MariaDB's account rules](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/create-user).

Test the same TCP connection that OPEN//77 will use, from the game server's
machine:

```bash
mariadb --protocol=TCP --host=127.0.0.1 --port=3306 --user=open77 --password open77
```

The client prompts for the password; do not put it directly in the command.
The equivalent MySQL client command starts with `mysql`. In that session:

```sql
SELECT DATABASE(), CURRENT_USER(), 1 AS connection_ok;
```

This proves authentication and database selection, not every resource's
migration permissions.

## 3. Configure OPEN//77

Merge this object into the **existing** `server.jsonc` you actually launch;
do not replace the rest of the file:

```json
{
  "database": {
    "enabled": true,
    "connectionString": "",
    "connectionStringEnvironmentVariable": "OP77_DATABASE_CONNECTION",
    "maxRows": 10000
  }
}
```

| Setting | Meaning |
|---|---|
| `database.enabled` | `false` by default. Must be `true` to create the bridge. |
| `database.connectionString` | An explicit nonblank value takes precedence over the environment. Leave it empty when using an environment secret. |
| `database.connectionStringEnvironmentVariable` | Name of the variable to read; defaults to `OP77_DATABASE_CONNECTION`. This field is a variable name, not the password. |
| `database.maxRows` | Maximum rows returned by one query: default `10000`, accepted range `1..1000000`. Extra rows are truncated with a warning, not paginated automatically. |

Supply a [MySqlConnector connection string](https://mysqlconnector.net/connection-options/)
to the **dedicated-server process**. This is a semicolon-separated string, not
a `mysql://` URL or FiveM's `set mysql_connection_string` directive.

Linux, for a manual development launch from this shell:

```bash
export OP77_DATABASE_CONNECTION='Server=127.0.0.1;Port=3306;Database=open77;User ID=open77;Password=REPLACE_WITH_A_UNIQUE_PASSWORD;'
# Launch your normal OPEN//77 server command from this same shell.
```

Windows PowerShell, for a manual development launch:

```powershell
$env:OP77_DATABASE_CONNECTION = 'Server=127.0.0.1;Port=3306;Database=open77;User ID=open77;Password=REPLACE_WITH_A_UNIQUE_PASSWORD;'
# Launch your normal OPEN//77 server command from this same PowerShell session.
```

These examples show syntax with a placeholder. Entering a real secret directly
can leave it in shell history; use your host's protected secret/configuration
mechanism for production. For systemd, containers or hosting panels, configure
the environment in that service/container/panel instead: exporting it in an
unrelated SSH shell does not change a running service's environment. Restrict
access to any environment file containing credentials. OPEN//77 does not
implicitly load an arbitrary `.env` file.

Restart the dedicated server after changing these settings. Reloading only a
Lua resource does not recreate the server-wide database bridge. An enabled
bridge with no effective connection string fails configuration validation.

## Remote SQL and containers

For a separate SQL host, use its reachable hostname in `Server`, create a SQL
account restricted to the game server's connecting address and restrict the
database firewall to that source. In a container, `127.0.0.1` means that
container; another container normally needs its service/DNS name and a shared
network. Use a persistent volume for the SQL data directory.

For remote production connections, use TLS with certificate and hostname
validation:

```text
Server=db.example.net;Port=3306;Database=open77;User ID=open77;Password=REPLACE_WITH_A_UNIQUE_PASSWORD;SslMode=VerifyFull;
```

If your provider uses a private CA, add its supplied `SslCa` file path. The
hostname must match the certificate. `SslMode=Required` encrypts but does not
validate the certificate's identity; it is not equivalent to `VerifyFull`.
See the [connector's TLS options](https://mysqlconnector.net/connection-options/#ssltls-options).

## 4. Verify readiness from Lua

Only **server scripts** with `database.access` can use SQL. Put these two files
in a resource named `sql_probe` under your configured resources directory:

```lua
-- open77.lua
resource "sql_probe"
version "1.0.0"
server_script "server.lua"
permissions { "database.access" }
```

```lua
-- server.lua
local queued, reason = MySQL.ready(function()
    local ok, result = pcall(function()
        return MySQL.scalar.await("SELECT ?", { 77 })
    end)

    if not ok then
        print("[sql_probe] query failed: " .. tostring(result))
        return
    end
    print("[sql_probe] connected; parameterized SELECT returned " .. tostring(result))
end)

if not queued then
    print("[sql_probe] readiness refused: " .. tostring(reason))
else
    local ready, state = MySQL.isReady()
    print("[sql_probe] state: " .. (ready and "ready" or tostring(state)))
end
```

From the **server console** or Warden console:

```text
refresh
ensure sql_probe
```

Expected server messages include:

```text
Database bridge enabled (maxRows=10000).
Database bridge reachable; MySQL.ready handlers released.
[sql_probe] connected; parameterized SELECT returned 77
```

The first message alone only means the bridge is configured. The second is
logged after a real `SELECT 1` probe succeeds. The Lua check additionally
verifies the resource's permission, scheduler and parameter binding without
creating or changing any tables.

`MySQL.ready` is a startup gate, **not a continuous health check**. Before the
first successful connection, the host retries with a backoff up to 30 seconds.
After that first success, handle failures of individual queries; readiness
does not revert to false during a later outage.

## 5. Use SQL in resources

Callback methods receive `(result, error)`. The `.await` variants must run in
a host-managed coroutine, such as `CreateThread`, an event handler or a
`MySQL.ready` callback. Queries run off the server tick; their continuations
resume on the owning resource's scheduler.

```lua
MySQL.ready(function()
    local ok, reason = pcall(function()
        MySQL.update.await([[
            CREATE TABLE IF NOT EXISTS my_resource_settings (
                setting_key VARCHAR(64) PRIMARY KEY,
                setting_value VARCHAR(255) NOT NULL
            )
        ]])
        MySQL.update.await([[
            INSERT INTO my_resource_settings (setting_key, setting_value)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ]], { "welcome", "Welcome to Night City" })
    end)
    if not ok then print("[my_resource] database setup failed: " .. tostring(reason)) end
end)
```

Bind values with `?` or named `@parameters`; never concatenate player input
into SQL. Use transactions for changes that must succeed together and handle
rollback results. Prefix tables with the resource name and key player data by
a persistent authenticated identity, not a temporary player/session ID.

**All resources with `database.access` share this server's configured database
and SQL account.** The permission does not create a private schema for each
resource. Enabling SQL also activates persistence paths in other loaded
resources that requested it, such as appearance storage. Review those resources
and back up the database before changing a live server's persistence behavior.

See the [database API reference](/docs/server-api#database) for method shapes,
readiness and transactions, and the [resource isolation explanation](/docs/resource-runtime#the-database-bridge-is-per-server-not-per-resource).

## Troubleshooting

| Symptom | What to check |
|---|---|
| Startup rejects an enabled database configuration | The effective connection string is empty, the environment variable name is blank or `maxRows` is outside its allowed range. |
| `Database bridge disabled.` / `database_unavailable` | Check the launched configuration path and `database.enabled`; restart the server after changes. `MySQL.ready` will not run when disabled. |
| `database_connecting` | The initial probe is pending. Wait for the reachable message. |
| `database_unreachable` / configured but not answering | Read the first probe warning; test the same host, port and account from the server machine. Check the SQL service, network and credentials. |
| Access denied | Check password, account host, authentication method and grants. A local administrator's socket login does not prove the application TCP login works. |
| Unknown database | Create the named database and check its exact spelling; the bridge does not create it. |
| Connection refused or timeout | Check the SQL listener, TCP port, container network, firewall and host name. Do not open SQL to every IP as a workaround. |
| TLS/certificate failure | Use the certificate's hostname, the correct CA and a valid server certificate. Check the host clock. Do not disable verification to hide a production configuration error. |
| `permission_denied:database.access` | Declare the permission in the calling resource and reload that resource. |
| `MySQL` is missing in Lua | The code is running on the client, or on a server build without this API; keep database code in `server_script`. |
| Missing table or migration denied | Run the resource's reviewed migration and grant only its required privileges on this database. |
| Queries fail after the ready callback ran | Treat each query failure explicitly. Startup readiness is latched, not a live availability guarantee. |
| Fewer rows than expected | Check the `maxRows` warning; use explicit ordering and bounded/paginated queries instead of relying on truncation. |

Before sharing logs, remove credentials, connection strings and sensitive
query data. Keep regular database backups and test restoration to a **separate**
database. A copy of `resources/` is not a backup of SQL data.

## Implementation references

The operator settings and lifecycle above are defined by
`DatabaseConfiguration` and `ResolveDatabaseConnectionString` in the server's
configuration loader, `DatabaseService` for the real readiness probe, and the
[platform database guide](https://github.com/Open2077/open77-base/blob/main/docs/database.md).
These are independent of the newer client WebUI changes; configuring SQL
does not require a browser UI or a client-side database password.
