[![npm version](https://img.shields.io/npm/v/totalgen.svg)](https://www.npmjs.com/package/totalgen)
[![npm downloads](https://img.shields.io/npm/dm/totalgen.svg)](https://www.npmjs.com/package/totalgen)
[![license](https://img.shields.io/npm/l/totalgen.svg)](https://www.npmjs.com/package/totalgen)


#  totalgen

> A simple, powerful CLI generator for Node.js in general and [Total.js](https://www.totaljs.com) specicially, with AI-enhanced output and custom project configuration.

---

## Installation

```bash
npm install -g totalgen
```

---

##  Usage

Run in terminal:

```bash
tg <command> <name> [--prompt="enhance with AI"]
```

###  Examples


- Template files generation commands

```bash
tg generate:migration create_users_table
tg generate:controller user
tg generate:plugin auth --prompt="secure JWT login system"
```

- Migrations specific commands

```sh
tg migrate                   # Run migrations
tg migration:migrate         # Run migrations
tg migration:rollback        # Run migrations rollback operation to revert
```

---

##  Features

* Generate files for:

  * `migration`
  * `controller`
  * `schema`
  * `plugin`
*  **AI Integration** with `--prompt`:

  * Enhance generated files using your prompt (e.g. "add validation", "make RESTful", etc.)
*  Configurable via `tgconfig.json`:

  * Set your preferred structure
  * Define AI integration keys and presets

---

##  Project Config (`tgconfig.json`)

You can place a `tgconfig.json` at the root of your project:

```json
{
  "debug": false,
  "location": "/",
  "table": "migrations",
  "db": {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "database": "tgconfig",
    "link": "postgresql://user:password@hostname:5432/database"
  },
  "ai": {
    "enabled": true,
    "provider": "openai",
    "apiKey": "YOUR_API_KEY"
  }
}
```
---

## AI Prompting Example

```bash
tg plugin notification --prompt="create a plugin to send email and SMS alerts"
```

The output will be enhanced based on your prompt using your preferred AI provider.

---
  
##  Roadmap

* [x] CLI Generator: controller, migration, schema, plugin
* [x] `tgconfig.json` support
* [x] AI prompt enhancement (`--prompt`)
* [ ] Route auto-injection
* [ ] Custom file templates

---

##  Author

Built with precision by **Louis Bertson**
GitHub: [@louisbertson](https://github.com/will-create)

---

##  Contribute

Found a bug or want to add a new generator?
Pull requests welcome. Open an issue or fork it!

---

##  License

MIT
