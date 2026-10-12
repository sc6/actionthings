import { getDb } from "./db";
import { OPS, type Op } from "./ops";
import { generateSprite, isValidSprite } from "./sprite";

export type Obj = { id: number; name: string; description: string; icon: string; created_at: string };
export type Label = { id: number; name: string };
export type LabelWithCount = Label & { objects: number; actions: number; attributes: number };
export type Attribute = {
  id: number;
  label_id: number;
  name: string;
  unit: string;
  /** Optional global bounds for every object's values. */
  range_min: number | null;
  range_max: number | null;
};
/** An attribute an object has through a label, with the object's values (null until set). */
export type ObjectAttribute = Attribute & {
  label_name: string;
  min: number | null;
  median: number | null;
  max: number | null;
};
export type { Op } from "./ops";

/**
 * One clause of an action's condition: compares the median of a target's
 * attribute with the median of the actor's own attribute, or with a value.
 */
export type Condition = {
  id: number;
  position: number;
  connector: "and" | "or";
  target_attribute_id: number;
  target_attribute: string;
  target_unit: string;
  op: Op;
  self_attribute_id: number | null;
  self_attribute: string | null;
  value: number | null;
};

/**
 * An action owned by a label: every object with the label has it. It targets
 * objects carrying all of `targets` for which `conditions` hold.
 */
export type Action = {
  id: number;
  verb: string;
  description: string;
  label_id: number;
  label_name: string;
  targets: Label[];
  conditions: Condition[];
};

/** An object's action, resolved against the current objects. */
export type ResolvedAction = Action & {
  /** Targets the condition holds for. */
  matches: Obj[];
  /** Targets the condition can't be decided for, because a value isn't set. */
  unknown: Obj[];
};

const db = () => getDb();

// ---------- objects ----------

export function listObjects(): Obj[] {
  return db().prepare("SELECT * FROM objects ORDER BY name COLLATE NOCASE, id").all() as Obj[];
}

export function getObject(id: number): Obj | undefined {
  return db().prepare("SELECT * FROM objects WHERE id = ?").get(id) as Obj | undefined;
}

export function createObject(name: string, description: string): number {
  return Number(
    db()
      .prepare("INSERT INTO objects (name, description, icon) VALUES (?, ?, ?)")
      .run(name, description, generateSprite(`${name}#${Date.now()}`)).lastInsertRowid,
  );
}

export function updateObject(id: number, name: string, description: string) {
  db().prepare("UPDATE objects SET name = ?, description = ? WHERE id = ?").run(name, description, id);
}

export function setObjectIcon(id: number, icon: string) {
  if (!isValidSprite(icon)) throw new Error("Invalid icon data");
  db().prepare("UPDATE objects SET icon = ? WHERE id = ?").run(icon, id);
}

export function deleteObject(id: number) {
  db().prepare("DELETE FROM objects WHERE id = ?").run(id);
}

// ---------- actions ----------

/** Loads actions (optionally filtered by owning label) with their targets and conditions. */
function loadActions(labelId?: number): Action[] {
  const d = db();
  const base = d
    .prepare(
      `SELECT ac.id, ac.verb, ac.description, ac.label_id, l.name AS label_name
       FROM actions ac JOIN labels l ON l.id = ac.label_id
       ${labelId === undefined ? "" : "WHERE ac.label_id = ?"}
       ORDER BY l.name COLLATE NOCASE, ac.verb, ac.id`,
    )
    .all(...(labelId === undefined ? [] : [labelId])) as Omit<Action, "targets" | "conditions">[];
  const targets = d
    .prepare(
      `SELECT at.action_id, l.id, l.name FROM action_targets at JOIN labels l ON l.id = at.label_id
       ORDER BY l.name COLLATE NOCASE`,
    )
    .all() as (Label & { action_id: number })[];
  const conditions = d
    .prepare(
      `SELECT c.*, ta.name AS target_attribute, ta.unit AS target_unit, sa.name AS self_attribute
       FROM action_conditions c
       JOIN attributes ta ON ta.id = c.target_attribute_id
       LEFT JOIN attributes sa ON sa.id = c.self_attribute_id
       ORDER BY c.position, c.id`,
    )
    .all() as (Condition & { action_id: number })[];
  return base.map((ac) => ({
    ...ac,
    targets: targets.filter((t) => t.action_id === ac.id).map(({ id, name }) => ({ id, name })),
    conditions: conditions.filter((c) => c.action_id === ac.id).map(({ action_id: _, ...c }) => c),
  }));
}

export function listActions(): Action[] {
  return loadActions();
}

export function actionsOfLabel(labelId: number): Action[] {
  return loadActions(labelId);
}

export function getAction(id: number): Action | undefined {
  return loadActions().find((ac) => ac.id === id);
}

function compare(a: number, op: Op, b: number): boolean {
  switch (op) {
    case "<": return a < b;
    case "<=": return a <= b;
    case "=": return a === b;
    case "!=": return a !== b;
    case ">=": return a >= b;
    case ">": return a > b;
  }
}

/**
 * Evaluates an action's conditions for one actor/target pair using medians.
 * Three-valued: null when a needed value isn't set. AND binds tighter than OR.
 */
export function evaluate(
  conditions: Condition[],
  medians: Map<number, Map<number, number>>,
  actorId: number,
  targetId: number,
): boolean | null {
  if (conditions.length === 0) return true;
  const clause = (c: Condition): boolean | null => {
    const left = medians.get(targetId)?.get(c.target_attribute_id);
    const right = c.self_attribute_id !== null ? medians.get(actorId)?.get(c.self_attribute_id) : c.value;
    if (left === undefined || right === undefined || right === null) return null;
    return compare(left, c.op, right);
  };
  // Split into OR-separated groups of AND-ed clauses.
  const groups: Condition[][] = [];
  for (const c of conditions) {
    if (groups.length === 0 || c.connector === "or") groups.push([c]);
    else groups[groups.length - 1].push(c);
  }
  let result: boolean | null = false;
  for (const group of groups) {
    let all: boolean | null = true;
    for (const c of group) {
      const v = clause(c);
      if (v === false) {
        all = false;
        break;
      }
      if (v === null) all = null;
    }
    if (all === true) return true;
    if (all === null) result = null;
  }
  return result;
}

/** objectId -> attributeId -> median, for every value that's set. */
function allMedians(): Map<number, Map<number, number>> {
  const rows = db().prepare("SELECT object_id, attribute_id, median FROM attribute_values").all() as {
    object_id: number;
    attribute_id: number;
    median: number;
  }[];
  const map = new Map<number, Map<number, number>>();
  for (const r of rows) {
    if (!map.has(r.object_id)) map.set(r.object_id, new Map());
    map.get(r.object_id)!.set(r.attribute_id, r.median);
  }
  return map;
}

/** Actions an object has through its labels, with the objects each one currently targets. */
export function actionsOf(objectId: number): ResolvedAction[] {
  const own = new Set(labelsOf(objectId).map((l) => l.id));
  const actions = loadActions().filter((ac) => own.has(ac.label_id));
  if (actions.length === 0) return [];
  const medians = allMedians();
  const labels = labelsByObject();
  const objects = listObjects();
  return actions.map((ac) => {
    const candidates =
      ac.targets.length === 0
        ? []
        : objects.filter((o) => {
            if (o.id === objectId) return false;
            const has = new Set((labels.get(o.id) ?? []).map((l) => l.id));
            return ac.targets.every((t) => has.has(t.id));
          });
    const matches: Obj[] = [];
    const unknown: Obj[] = [];
    for (const o of candidates) {
      const r = evaluate(ac.conditions, medians, objectId, o.id);
      if (r === true) matches.push(o);
      else if (r === null) unknown.push(o);
    }
    return { ...ac, matches, unknown };
  });
}

/** Map of object id -> the actions it has through its labels (unresolved). */
export function actionsByObject(): Map<number, Action[]> {
  const actions = loadActions();
  const map = new Map<number, Action[]>();
  for (const [objectId, labels] of labelsByObject()) {
    const own = new Set(labels.map((l) => l.id));
    map.set(
      objectId,
      actions.filter((ac) => own.has(ac.label_id)),
    );
  }
  return map;
}

export function createAction(labelId: number, verb: string, description: string) {
  if (!getLabel(labelId)) throw new Error("Label not found");
  db().prepare("INSERT INTO actions (label_id, verb, description) VALUES (?, ?, ?)").run(labelId, verb, description);
}

export function deleteAction(id: number) {
  db().prepare("DELETE FROM actions WHERE id = ?").run(id);
}

/** Adds a target label by name, creating the label if it's new. */
export function addActionTarget(actionId: number, name: string) {
  const d = db();
  d.transaction(() => {
    d.prepare("INSERT OR IGNORE INTO labels (name) VALUES (?)").run(name);
    d.prepare("INSERT OR IGNORE INTO action_targets (action_id, label_id) SELECT ?, id FROM labels WHERE name = ?").run(
      actionId,
      name,
    );
  })();
}

/** Removes a target label, and any clauses that compare that label's attributes. */
export function removeActionTarget(actionId: number, labelId: number) {
  const d = db();
  d.transaction(() => {
    d.prepare("DELETE FROM action_targets WHERE action_id = ? AND label_id = ?").run(actionId, labelId);
    d.prepare(
      `DELETE FROM action_conditions WHERE action_id = ?
         AND target_attribute_id IN (SELECT id FROM attributes WHERE label_id = ?)`,
    ).run(actionId, labelId);
  })();
}

export function addCondition(
  actionId: number,
  connector: "and" | "or",
  targetAttributeId: number,
  op: Op,
  rhs: { selfAttributeId: number } | { value: number },
) {
  const d = db();
  const action = getAction(actionId);
  if (!action) throw new Error("Action not found");
  if (!OPS.includes(op)) throw new Error("Unknown comparison");
  const targetAttr = d.prepare("SELECT label_id FROM attributes WHERE id = ?").get(targetAttributeId) as
    | { label_id: number }
    | undefined;
  if (!targetAttr || !action.targets.some((t) => t.id === targetAttr.label_id)) {
    throw new Error("The compared attribute must come from one of the action's target labels");
  }
  if ("selfAttributeId" in rhs) {
    const selfAttr = d.prepare("SELECT label_id FROM attributes WHERE id = ?").get(rhs.selfAttributeId) as
      | { label_id: number }
      | undefined;
    if (!selfAttr || selfAttr.label_id !== action.label_id) {
      throw new Error(`"my" attributes must come from #${action.label_name}`);
    }
  }
  const position = (
    d.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS p FROM action_conditions WHERE action_id = ?").get(actionId) as {
      p: number;
    }
  ).p;
  d.prepare(
    `INSERT INTO action_conditions (action_id, position, connector, target_attribute_id, op, self_attribute_id, value)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    actionId,
    position,
    connector,
    targetAttributeId,
    op,
    "selfAttributeId" in rhs ? rhs.selfAttributeId : null,
    "value" in rhs ? rhs.value : null,
  );
}

export function removeCondition(id: number) {
  db().prepare("DELETE FROM action_conditions WHERE id = ?").run(id);
}

// ---------- labels ----------

export function listLabels(): LabelWithCount[] {
  return db()
    .prepare(
      `SELECT l.*,
         (SELECT COUNT(*) FROM object_labels WHERE label_id = l.id) AS objects,
         (SELECT COUNT(*) FROM actions WHERE label_id = l.id) AS actions,
         (SELECT COUNT(*) FROM attributes WHERE label_id = l.id) AS attributes
       FROM labels l ORDER BY l.name COLLATE NOCASE`,
    )
    .all() as LabelWithCount[];
}

export function getLabel(id: number): Label | undefined {
  return db().prepare("SELECT * FROM labels WHERE id = ?").get(id) as Label | undefined;
}

export function labelsOf(objectId: number): Label[] {
  return db()
    .prepare(
      `SELECT l.* FROM labels l JOIN object_labels ol ON ol.label_id = l.id
       WHERE ol.object_id = ? ORDER BY l.name COLLATE NOCASE`,
    )
    .all(objectId) as Label[];
}

/** Map of object id -> its labels, for every object. */
export function labelsByObject(): Map<number, Label[]> {
  const rows = db()
    .prepare(
      `SELECT ol.object_id, l.id, l.name FROM object_labels ol JOIN labels l ON l.id = ol.label_id
       ORDER BY l.name COLLATE NOCASE`,
    )
    .all() as (Label & { object_id: number })[];
  const map = new Map<number, Label[]>();
  for (const { object_id, ...label } of rows) {
    if (!map.has(object_id)) map.set(object_id, []);
    map.get(object_id)!.push(label);
  }
  return map;
}

export function objectsWithLabel(labelId: number): Obj[] {
  return db()
    .prepare(
      `SELECT o.* FROM objects o JOIN object_labels ol ON ol.object_id = o.id
       WHERE ol.label_id = ? ORDER BY o.name COLLATE NOCASE, o.id`,
    )
    .all(labelId) as Obj[];
}

/** Assigns a label by name, creating the label if none has that name (case-insensitive). */
export function addLabel(objectId: number, name: string) {
  const d = db();
  d.transaction(() => {
    d.prepare("INSERT OR IGNORE INTO labels (name) VALUES (?)").run(name);
    d.prepare("INSERT OR IGNORE INTO object_labels (object_id, label_id) SELECT ?, id FROM labels WHERE name = ?").run(
      objectId,
      name,
    );
  })();
}

export function removeLabel(objectId: number, labelId: number) {
  db().prepare("DELETE FROM object_labels WHERE object_id = ? AND label_id = ?").run(objectId, labelId);
}

export function renameLabel(id: number, name: string) {
  const clash = db().prepare("SELECT 1 FROM labels WHERE name = ? AND id != ?").get(name, id);
  if (clash) throw new Error(`A label named "${name}" already exists`);
  db().prepare("UPDATE labels SET name = ? WHERE id = ?").run(name, id);
}

export function deleteLabel(id: number) {
  db().prepare("DELETE FROM labels WHERE id = ?").run(id);
}

// ---------- attributes ----------

export function attributesOfLabel(labelId: number): Attribute[] {
  return db()
    .prepare("SELECT * FROM attributes WHERE label_id = ? ORDER BY name COLLATE NOCASE")
    .all(labelId) as Attribute[];
}

/** Attributes an object has through its labels, with its values. */
export function attributesOf(objectId: number): ObjectAttribute[] {
  return db()
    .prepare(
      `SELECT a.*, l.name AS label_name, v.min, v.median, v.max
       FROM attributes a
       JOIN labels l ON l.id = a.label_id
       JOIN object_labels ol ON ol.label_id = a.label_id AND ol.object_id = ?
       LEFT JOIN attribute_values v ON v.attribute_id = a.id AND v.object_id = ol.object_id
       ORDER BY a.name COLLATE NOCASE, l.name COLLATE NOCASE`,
    )
    .all(objectId) as ObjectAttribute[];
}

function checkRange(rangeMin: number | null, rangeMax: number | null) {
  if (rangeMin !== null && rangeMax !== null && rangeMin > rangeMax) {
    throw new Error("Global min must be ≤ global max");
  }
}

export function createAttribute(
  labelId: number,
  name: string,
  unit: string,
  rangeMin: number | null,
  rangeMax: number | null,
) {
  if (!getLabel(labelId)) throw new Error("Label not found");
  checkRange(rangeMin, rangeMax);
  db()
    .prepare("INSERT OR IGNORE INTO attributes (label_id, name, unit, range_min, range_max) VALUES (?, ?, ?, ?, ?)")
    .run(labelId, name, unit, rangeMin, rangeMax);
}

/** Updates an attribute. Refuses a global range that existing object values fall outside of. */
export function updateAttribute(
  id: number,
  name: string,
  unit: string,
  rangeMin: number | null,
  rangeMax: number | null,
) {
  checkRange(rangeMin, rangeMax);
  const d = db();
  const outside = d
    .prepare(
      `SELECT o.name FROM attribute_values v JOIN objects o ON o.id = v.object_id
       WHERE v.attribute_id = ?
         AND ((? IS NOT NULL AND COALESCE(v.min, v.median) < ?) OR (? IS NOT NULL AND COALESCE(v.max, v.median) > ?))
       ORDER BY o.name COLLATE NOCASE`,
    )
    .all(id, rangeMin, rangeMin, rangeMax, rangeMax) as { name: string }[];
  if (outside.length) {
    throw new Error(`Values for ${outside.map((o) => o.name).join(", ")} fall outside that range; adjust them first`);
  }
  const clash = d
    .prepare("SELECT 1 FROM attributes WHERE name = ? AND id != ? AND label_id = (SELECT label_id FROM attributes WHERE id = ?)")
    .get(name, id, id);
  if (clash) throw new Error(`This label already has an attribute named "${name}"`);
  d.prepare("UPDATE attributes SET name = ?, unit = ?, range_min = ?, range_max = ? WHERE id = ?").run(
    name,
    unit,
    rangeMin,
    rangeMax,
    id,
  );
}

export function deleteAttribute(id: number) {
  db().prepare("DELETE FROM attributes WHERE id = ?").run(id);
}

/** Saves an object's values for an attribute. The median is required; min and max are optional. */
export function setAttributeValues(
  objectId: number,
  attributeId: number,
  min: number | null,
  median: number,
  max: number | null,
) {
  if (min !== null && min > median) throw new Error("min must be ≤ median");
  if (max !== null && median > max) throw new Error("median must be ≤ max");
  const owned = db()
    .prepare(
      `SELECT 1 FROM attributes a JOIN object_labels ol ON ol.label_id = a.label_id
       WHERE a.id = ? AND ol.object_id = ?`,
    )
    .get(attributeId, objectId);
  if (!owned) throw new Error("This object doesn't have that attribute");
  const range = db().prepare("SELECT range_min, range_max FROM attributes WHERE id = ?").get(attributeId) as {
    range_min: number | null;
    range_max: number | null;
  };
  // The lowest / highest value given must sit inside the global range.
  if (range.range_min !== null && (min ?? median) < range.range_min) {
    throw new Error(`values must be ≥ ${range.range_min}`);
  }
  if (range.range_max !== null && (max ?? median) > range.range_max) {
    throw new Error(`values must be ≤ ${range.range_max}`);
  }
  db()
    .prepare(
      `INSERT INTO attribute_values (object_id, attribute_id, min, median, max) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (object_id, attribute_id) DO UPDATE SET min = excluded.min, median = excluded.median, max = excluded.max`,
    )
    .run(objectId, attributeId, min, median, max);
}

/** Attributes provided by any of the given labels. */
export function attributesOfLabels(labelIds: number[]): (Attribute & { label_name: string })[] {
  if (labelIds.length === 0) return [];
  return db()
    .prepare(
      `SELECT a.*, l.name AS label_name FROM attributes a JOIN labels l ON l.id = a.label_id
       WHERE a.label_id IN (${labelIds.map(() => "?").join(",")})
       ORDER BY l.name COLLATE NOCASE, a.name COLLATE NOCASE`,
    )
    .all(...labelIds) as (Attribute & { label_name: string })[];
}

export function stats() {
  const d = db();
  const count = (table: string) => (d.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
  return { objects: count("objects"), labels: count("labels"), actions: count("actions") };
}
