# actionthings

A local Next.js app for tracking **objects**, their **attributes**, and the **actions** between them.
Data lives in a SQLite file (`data/actionthings.db`). Nothing is fetched over the network.

## Model

| table     | meaning                                                                     |
| --------- | --------------------------------------------------------------------------- |
| `objects` | tracked things, each with a 16×16 pixel-art icon (shown at 128×128)         |
| `labels`  | categories assigned to objects, e.g. torch is `#flammable` and `#aflame`    |
| `actions` | owned by a label; target objects with all of its target labels that satisfy its condition |
| `action_targets` | the labels an action's target must carry                              |
| `action_conditions` | AND / OR clauses comparing a target attribute's median with the actor's own attribute or a value |
| `attributes` | owned by a label: a name, unit and optional global min / max, e.g. `#animal` → curiosity (1–10) |
| `attribute_values` | each object's own values for an attribute: median required, min / max optional |

An object can have any number of labels; type one on the object's page to assign an existing label
or create a new one. Labels provide attributes and actions to every object carrying them. Each object sets its own
median (required) and optional min / max for its attributes, shown as a number line (diamond =
median, yellow bar = the span between whichever values are set).
An attribute may have a global min and/or max; object values must stay within it, and the number
line then spans exactly that range.

An action targets labels and filters with a condition, e.g. `#aflame → ignites → #flammable where
ignition temperature ≥ my flame temperature`. Clauses compare medians and are joined with AND / OR
(AND binds tighter). An object's page lists which objects each action currently targets; objects
missing a needed value are shown as unknown. Define attributes and actions on a label's page.

Databases from earlier versions are migrated automatically on startup, with a backup copy
(`data/actionthings.db.pre-<version>-<timestamp>.bak`) written first.

## Run

```sh
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

The database is created and seeded with sample data on first request.
`npm run db:reset` deletes it. Set `ACTIONTHINGS_DB=/path/to/file.db` to use a different file.

## Layout

- `lib/db.ts`: connection, schema, seed data
- `lib/repo.ts`: queries
- `lib/sprite.ts`: palette plus the procedural sprite generator
- `app/actions.ts`: server actions (mutations)
- `components/IconEditor.tsx`: pixel icon editor
- `components/ObjectPicker.tsx`: typeahead for choosing a target object
