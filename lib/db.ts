import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { generateSprite } from "./sprite";

const DB_PATH = process.env.ACTIONTHINGS_DB ?? path.join(process.cwd(), "data", "actionthings.db");

const LABEL_SCHEMA = `
-- Categories assigned to objects, e.g. torch: #flammable #aflame.
CREATE TABLE IF NOT EXISTS labels (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS object_labels (
  object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  label_id  INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (object_id, label_id)
);

CREATE INDEX IF NOT EXISTS object_labels_label ON object_labels(label_id);
`;

const ACTION_SCHEMA = `
-- An action owned by a label: every object with the label has it. It targets
-- objects carrying all of its target labels that satisfy its conditions, e.g.
-- #aflame —ignites→ #flammable where ignition temperature ≥ my flame temperature.
CREATE TABLE IF NOT EXISTS actions (
  id          INTEGER PRIMARY KEY,
  label_id    INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  verb        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS action_targets (
  action_id INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  label_id  INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (action_id, label_id)
);

-- Clauses compare a target attribute's median with the actor's own attribute
-- median or a fixed value. Clauses are joined by their connector in position
-- order; AND binds tighter than OR. The first clause's connector is unused.
CREATE TABLE IF NOT EXISTS action_conditions (
  id                  INTEGER PRIMARY KEY,
  action_id           INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  position            INTEGER NOT NULL,
  connector           TEXT NOT NULL DEFAULT 'and' CHECK (connector IN ('and', 'or')),
  target_attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  op                  TEXT NOT NULL CHECK (op IN ('<', '<=', '=', '!=', '>=', '>')),
  self_attribute_id   INTEGER REFERENCES attributes(id) ON DELETE CASCADE,
  value               REAL,
  CHECK ((self_attribute_id IS NULL) != (value IS NULL))
);
`;

// Each object owns its values for an attribute: the median always, min and max optionally.
const VALUES_SCHEMA = `
CREATE TABLE IF NOT EXISTS attribute_values (
  object_id    INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  min          REAL,
  median       REAL NOT NULL,
  max          REAL,
  PRIMARY KEY (object_id, attribute_id),
  CHECK (min IS NULL OR min <= median),
  CHECK (max IS NULL OR median <= max)
);
`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS objects (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
${LABEL_SCHEMA}
${ACTION_SCHEMA}
-- An attribute owned by a label: every object with the label has it, e.g.
-- #aflame provides "flame temperature" in Fahrenheit. An optional global range
-- (range_min / range_max, either may be null) bounds every object's values.
CREATE TABLE IF NOT EXISTS attributes (
  id        INTEGER PRIMARY KEY,
  label_id  INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  unit      TEXT NOT NULL DEFAULT '',
  range_min REAL,
  range_max REAL,
  UNIQUE (label_id, name),
  CHECK (range_min IS NULL OR range_max IS NULL OR range_min <= range_max)
);

${VALUES_SCHEMA}`;

function seed(db: Database.Database) {
  const obj = db.prepare("INSERT INTO objects (name, description, icon) VALUES (?, ?, ?)");
  const make = (name: string, description: string) => obj.run(name, description, generateSprite(name)).lastInsertRowid;

  const cat = make("cat", "A small, curious feline");
  const fish = make("fish", "Freshly caught");
  const box = make("box", "Cardboard, slightly dented");
  const torch = make("torch", "A burning stick");

  const label = db.prepare("INSERT OR IGNORE INTO labels (name) VALUES (?)");
  const tag = db.prepare("INSERT INTO object_labels (object_id, label_id) SELECT ?, id FROM labels WHERE name = ?");
  const labels: [number | bigint, string[]][] = [
    [cat, ["animal", "hungry"]],
    [fish, ["animal", "edible"]],
    [box, ["container", "flammable"]],
    [torch, ["flammable", "aflame"]],
  ];
  for (const [id, names] of labels) {
    for (const name of names) {
      label.run(name);
      tag.run(id, name);
    }
  }

  const attr = db.prepare(
    "INSERT INTO attributes (label_id, name, unit, range_min, range_max) SELECT id, ?, ?, ?, ? FROM labels WHERE name = ?",
  );
  const value = db.prepare(
    `INSERT INTO attribute_values (object_id, attribute_id, min, median, max)
     SELECT ?, a.id, ?, ?, ? FROM attributes a JOIN labels l ON l.id = a.label_id WHERE l.name = ? AND a.name = ?`,
  );
  attr.run("flame temperature", "Fahrenheit", null, null, "aflame");
  attr.run("ignition temperature", "Fahrenheit", null, null, "flammable");
  attr.run("curiosity", "", 1, 10, "animal");
  value.run(torch, 932, 1000, 1832, "aflame", "flame temperature");
  value.run(box, 900, 1050, 1200, "flammable", "ignition temperature");
  value.run(torch, 500, 600, 700, "flammable", "ignition temperature");
  value.run(cat, 6, 8, 10, "animal", "curiosity");
  value.run(fish, 1, 2, 3, "animal", "curiosity");

  const action = (owner: string, verb: string, description: string, targets: string[]) => {
    const id = db
      .prepare("INSERT INTO actions (label_id, verb, description) SELECT id, ?, ? FROM labels WHERE name = ?")
      .run(verb, description, owner).lastInsertRowid;
    for (const t of targets) {
      db.prepare("INSERT INTO action_targets (action_id, label_id) SELECT ?, id FROM labels WHERE name = ?").run(id, t);
    }
    return id;
  };
  action("hungry", "eat", "Consume the target", ["edible"]);
  action("animal", "hide in", "Get inside the target", ["container"]);
  const ignite = action("aflame", "ignite", "Set the target on fire", ["flammable"]);
  db.prepare(
    `INSERT INTO action_conditions (action_id, position, target_attribute_id, op, self_attribute_id)
     SELECT ?, 1, t.id, '>=', s.id FROM attributes t, attributes s
     WHERE t.name = 'ignition temperature' AND s.name = 'flame temperature'`,
  ).run(ignite);
}

const hasTable = (db: Database.Database, name: string) =>
  !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);

const hasColumn = (db: Database.Database, table: string, column: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);

/** Keep a copy of the database file next to it before a migration. */
function backup(db: Database.Database, version: string) {
  db.prepare("VACUUM INTO ?").run(`${DB_PATH}.pre-${version}-${Date.now()}.bak`);
}

/**
 * Bring databases from earlier versions up to date:
 *  v1: action_types (attribute → attribute) plus an actions log
 *  v2: attributes owning actions (attribute → attribute)
 *  v3: objects owning actions (object → object), no attributes
 *  v4: labels owning actions (label → object); labels later also own attributes
 *  v5: actions target labels, filtered by conditions on attributes
 *  v6: attribute values' min / max become optional
 * Runs with foreign keys off.
 */
function migrate(db: Database.Database) {
  // v2's attributes table predates labels; today's is owned by a label.
  if (hasTable(db, "attributes") && !hasColumn(db, "attributes", "label_id")) {
    backup(db, "v3");
    db.transaction(() => {
      if (hasColumn(db, "actions", "actor_id")) {
        db.exec(`
          DROP TABLE actions;
          ALTER TABLE action_types RENAME TO actions;
          ALTER TABLE actions RENAME COLUMN actor_attribute_id TO source_attribute_id;
        `);
      }
      // Expand each attribute action into object actions between the objects holding those attributes.
      db.exec(`
        ALTER TABLE actions RENAME TO attribute_actions;
        CREATE TABLE actions (
          id          INTEGER PRIMARY KEY,
          object_id   INTEGER NOT NULL,
          verb        TEXT NOT NULL,
          target_id   INTEGER NOT NULL,
          description TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO actions (object_id, verb, target_id, description)
          SELECT DISTINCT src.object_id, aa.verb, tgt.object_id, aa.description
          FROM attribute_actions aa
          JOIN object_attributes src ON src.attribute_id = aa.source_attribute_id
          JOIN object_attributes tgt ON tgt.attribute_id = aa.target_attribute_id
          WHERE src.object_id != tgt.object_id;
        DROP TABLE attribute_actions;
        DROP TABLE object_attributes;
        DROP TABLE attributes;
      `);
    })();
  }

  if (hasTable(db, "actions") && hasColumn(db, "actions", "object_id")) {
    backup(db, "v4");
    // Move each object's actions to a label named after the object, assigned to that object.
    db.transaction(() => {
      db.exec(`
        ${LABEL_SCHEMA}
        INSERT OR IGNORE INTO labels (name)
          SELECT DISTINCT o.name FROM actions a JOIN objects o ON o.id = a.object_id;
        INSERT OR IGNORE INTO object_labels (object_id, label_id)
          SELECT DISTINCT a.object_id, l.id
          FROM actions a JOIN objects o ON o.id = a.object_id JOIN labels l ON l.name = o.name;
        ALTER TABLE actions RENAME TO object_actions;
        CREATE TABLE actions (
          id          INTEGER PRIMARY KEY,
          label_id    INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
          verb        TEXT NOT NULL,
          target_id   INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
          description TEXT NOT NULL DEFAULT '',
          UNIQUE (label_id, verb, target_id)
        );
        INSERT OR IGNORE INTO actions (label_id, verb, target_id, description)
          SELECT l.id, a.verb, a.target_id, a.description
          FROM object_actions a JOIN objects o ON o.id = a.object_id JOIN labels l ON l.name = o.name
          ORDER BY a.id;
        DROP TABLE object_actions;
      `);
    })();
  }

  if (hasTable(db, "actions") && hasColumn(db, "actions", "target_id")) {
    backup(db, "v5");
    // Each target object becomes a label named after it, assigned to it, and targeted instead.
    db.transaction(() => {
      db.exec(`
        INSERT OR IGNORE INTO labels (name)
          SELECT DISTINCT o.name FROM actions a JOIN objects o ON o.id = a.target_id;
        INSERT OR IGNORE INTO object_labels (object_id, label_id)
          SELECT DISTINCT a.target_id, l.id
          FROM actions a JOIN objects o ON o.id = a.target_id JOIN labels l ON l.name = o.name;
        ALTER TABLE actions RENAME TO object_target_actions;
        ${ACTION_SCHEMA}
        INSERT INTO actions (id, label_id, verb, description)
          SELECT id, label_id, verb, description FROM object_target_actions;
        INSERT OR IGNORE INTO action_targets (action_id, label_id)
          SELECT a.id, l.id
          FROM object_target_actions a JOIN objects o ON o.id = a.target_id JOIN labels l ON l.name = o.name;
        DROP TABLE object_target_actions;
      `);
    })();
  }

  const notNull = (table: string, column: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; notnull: number }[]).some(
      (c) => c.name === column && c.notnull === 1,
    );
  if (hasTable(db, "attribute_values") && notNull("attribute_values", "min")) {
    backup(db, "v6");
    // SQLite can't relax NOT NULL in place: rebuild the table and copy every row.
    db.transaction(() => {
      db.exec(`
        ALTER TABLE attribute_values RENAME TO attribute_values_v5;
        ${VALUES_SCHEMA}
        -- Skip rows orphaned by deletes made outside the app (foreign keys unenforced there).
        INSERT INTO attribute_values (object_id, attribute_id, min, median, max)
          SELECT object_id, attribute_id, min, median, max FROM attribute_values_v5
          WHERE object_id IN (SELECT id FROM objects) AND attribute_id IN (SELECT id FROM attributes);
        DROP TABLE attribute_values_v5;
      `);
    })();
  }
}

/**
 * Names (objects, labels, attributes) are lowercase only. Lowercases any stored
 * before that rule, in JS so non-ASCII letters are handled too. An attribute
 * whose lowercase name would clash with another on its label is left as is.
 */
function lowercaseNames(db: Database.Database) {
  for (const table of ["objects", "labels", "attributes"]) {
    const rows = db.prepare(`SELECT id, name FROM ${table}`).all() as { id: number; name: string }[];
    const update = db.prepare(`UPDATE OR IGNORE ${table} SET name = ? WHERE id = ?`);
    for (const r of rows) {
      const lower = r.name.toLowerCase();
      if (lower !== r.name) update.run(lower, r.id);
    }
  }
}

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  const fresh = !hasTable(db, "objects");
  // better-sqlite3 enforces foreign keys by default; table rebuilds need them off.
  db.pragma("foreign_keys = OFF");
  migrate(db);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  // Columns added after the table first shipped.
  if (!hasColumn(db, "attributes", "range_min")) {
    db.exec("ALTER TABLE attributes ADD COLUMN range_min REAL; ALTER TABLE attributes ADD COLUMN range_max REAL;");
  }
  db.transaction(lowercaseNames)(db);
  if (fresh) db.transaction(seed)(db);
  return db;
}

// Reuse one connection across dev-server hot reloads.
const g = globalThis as unknown as { __actionthingsDb?: Database.Database };

export function getDb(): Database.Database {
  return (g.__actionthingsDb ??= open());
}
