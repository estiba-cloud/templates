# Estiba templates

Apps ready to deploy on [Estiba](https://estiba.cloud) in one click. Each folder in `list/` is one app: Estiba's dashboard lists them under **New service**, asks only for what the template needs (a password comes generated), and creates the service. An agent connected to Estiba finds them with the `list_templates` tool.

Every push to `main` checks them and writes them all to `index.json`, which CI commits; Estiba reads it at `https://templates.estiba.cloud/index.json`, which redirects to this repository's files on raw.githubusercontent.com. Do not edit `index.json` by hand.

## Add your app

Open a pull request with one folder, `list/<id>/`, holding `config.json` and `logo.svg` (or `logo.png`, square, up to 64 KB). The `id` becomes the service's name, so it is lowercase letters, digits, `.`, `_` or `-`. `node build.mjs` (after `npm ci`) checks it the same way the pull request does.

```json
{
  "$schema": "../../schema.json",
  "name": "MariaDB",
  "description": "MySQL-compatible database, with one user and a database of the same name.",
  "category": "database",
  "url": "https://mariadb.org",
  "author": "https://github.com/MariaDB",
  "inputs": [
    { "name": "USER", "label": "User", "default": "app" },
    { "name": "PASSWORD", "label": "Password", "generate": true }
  ],
  "service": {
    "image": "mariadb:11.8",
    "env": { "MARIADB_USER": "${USER}", "MARIADB_DATABASE": "${USER}" },
    "secrets": { "MARIADB_PASSWORD": "${PASSWORD}" },
    "ports": [{ "port": 3306, "protocol": "tcp" }],
    "volumes": [{ "folder": "data", "path": "/var/lib/mysql" }]
  }
}
```

- `description` is one sentence in English, and `category` where it is listed: `database`, `web`, `monitoring`, `automation`, `storage`, `development`, `ai`, `media`, `games` or `messaging`.
- `url` is the app's website and `author` one link to whoever makes it (GitHub, X, a website).
- The date it shows as last updated is the last commit that changed anything in its folder.
- `inputs` are what the person fills in, all required. `default` fills one in, `generate: true` fills it with 32 random letters and digits (for passwords), and `type: "domain"` asks for a domain of theirs. Each `${NAME}` in `service` is replaced with its value.
- `service` holds the fields of a service as Estiba's `create_service` takes them, without its name: `image`, `command`, `env`, `secrets`, `ports`, `domains`, `volumes`, `alwaysOn` and `grace`. Passwords go in `secrets`, files that must last in `volumes`. The image has a tag that is not `latest`, and Estiba does not update it by itself.

A service with `ports` is reached at `ports.estiba.cloud` on a public port, from anywhere: that is why passwords are generated. Estiba only lists images it can run as they are, with no Docker socket and nothing privileged.
