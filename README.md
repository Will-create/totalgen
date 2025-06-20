# ⚡ totalgen

> A simple, powerful CLI generator for [Total.js](https://www.totaljs.com), with AI-enhanced output and custom project configuration.

---

## 📦 Installation

```bash
npm install -g totalgen
````

---

## 🚀 Usage

Run in terminal:

```bash
tg <command> <name> [--prompt="enhance with AI"]
```

### ✅ Examples

```bash
tg generate:migration create_users_table
tg generate:controller user
tg generate:plugin auth --prompt="secure JWT login system"
```

---

## ✨ Features

* 🛠️ Generate files for:

  * `migration`
  * `controller`
  * `schema`
  * `plugin`
* 🤖 **AI Integration** with `--prompt`:

  * Enhance generated files using your prompt (e.g. "add validation", "make RESTful", etc.)
* ⚙️ Configurable via `tgconfig.json`:

  * Set your preferred structure
  * Define AI integration keys and presets

---

## 📁 Project Config (`tgconfig.json`)

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

## 🧠 AI Prompting Example

```bash
tg plugin notification --prompt="create a plugin to send email and SMS alerts"
```

The output will be enhanced based on your prompt using your preferred AI provider.

---

## 📌 Roadmap

* [x] CLI Generator: controller, migration, schema, plugin
* [x] `tgconfig.json` support
* [ ] AI prompt enhancement (`--prompt`)
* [ ] Route auto-injection
* [ ] Custom file templates

---

## 👤 Author

Built with precision by **Louis Bertson**
GitHub: [@louisbertson](https://github.com/will-create)

---

## 🧪 Contribute

Found a bug or want to add a new generator?
Pull requests welcome. Open an issue or fork it!

---

## 🪪 License

MIT
