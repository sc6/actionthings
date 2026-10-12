"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Op } from "@/lib/ops";
import * as repo from "@/lib/repo";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function required(fd: FormData, key: string): string {
  const v = str(fd, key);
  if (!v) throw new Error(`"${key}" is required`);
  return v;
}

/** Object, label and attribute names are lowercase, with single spaces. */
function name(fd: FormData, key: string): string {
  return required(fd, key).replace(/\s+/g, " ").toLowerCase();
}

function id(fd: FormData, key: string): number {
  const n = Number(fd.get(key));
  if (!Number.isInteger(n) || n <= 0) throw new Error(`"${key}" is missing or invalid`);
  return n;
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------- objects ----------

export async function createObject(fd: FormData) {
  const newId = repo.createObject(name(fd, "name"), str(fd, "description"));
  refresh();
  redirect(`/objects/${newId}`);
}

export async function updateObject(fd: FormData) {
  repo.updateObject(id(fd, "id"), name(fd, "name"), str(fd, "description"));
  refresh();
}

export async function setObjectIcon(fd: FormData) {
  repo.setObjectIcon(id(fd, "id"), str(fd, "icon"));
  refresh();
}

export async function deleteObject(fd: FormData) {
  repo.deleteObject(id(fd, "id"));
  refresh();
  redirect("/objects");
}

// ---------- actions ----------

export async function createAction(fd: FormData) {
  repo.createAction(id(fd, "label_id"), required(fd, "verb"), str(fd, "description"));
  refresh();
}

export async function addActionTarget(fd: FormData) {
  repo.addActionTarget(id(fd, "action_id"), labelName(fd, "name"));
  refresh();
}

export async function removeActionTarget(fd: FormData) {
  repo.removeActionTarget(id(fd, "action_id"), id(fd, "label_id"));
  refresh();
}

export async function addCondition(fd: FormData) {
  const rhs = str(fd, "rhs");
  repo.addCondition(
    id(fd, "action_id"),
    str(fd, "connector") === "or" ? "or" : "and",
    id(fd, "target_attribute_id"),
    str(fd, "op") as Op,
    rhs === "value" ? { value: num(fd, "value") } : { selfAttributeId: id(fd, "rhs") },
  );
  refresh();
}

export async function removeCondition(fd: FormData) {
  repo.removeCondition(id(fd, "id"));
  refresh();
}

export async function deleteAction(fd: FormData) {
  repo.deleteAction(id(fd, "id"));
  refresh();
}

// ---------- labels ----------

/** Label name from a text input: no leading "#", single spaces. */
function labelName(fd: FormData, key: string): string {
  const label = str(fd, key).replace(/^#+/, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!label) throw new Error(`"${key}" is required`);
  return label;
}

export async function addLabel(fd: FormData) {
  repo.addLabel(id(fd, "object_id"), labelName(fd, "name"));
  refresh();
}

export async function removeLabel(fd: FormData) {
  repo.removeLabel(id(fd, "object_id"), id(fd, "label_id"));
  refresh();
}

export async function renameLabel(fd: FormData) {
  repo.renameLabel(id(fd, "id"), labelName(fd, "name"));
  refresh();
}

export async function deleteLabel(fd: FormData) {
  repo.deleteLabel(id(fd, "id"));
  refresh();
  redirect("/labels");
}

// ---------- attributes ----------

function num(fd: FormData, key: string): number {
  const raw = str(fd, key);
  const n = Number(raw);
  if (raw === "" || !Number.isFinite(n)) throw new Error(`"${key}" must be a number`);
  return n;
}

/** Optional number field: null when left blank. */
function optNum(fd: FormData, key: string): number | null {
  return str(fd, key) === "" ? null : num(fd, key);
}

export async function createAttribute(fd: FormData) {
  repo.createAttribute(
    id(fd, "label_id"),
    name(fd, "name"),
    str(fd, "unit"),
    optNum(fd, "range_min"),
    optNum(fd, "range_max"),
  );
  refresh();
}

export async function updateAttribute(fd: FormData) {
  repo.updateAttribute(
    id(fd, "id"),
    name(fd, "name"),
    str(fd, "unit"),
    optNum(fd, "range_min"),
    optNum(fd, "range_max"),
  );
  refresh();
}

export async function deleteAttribute(fd: FormData) {
  repo.deleteAttribute(id(fd, "id"));
  refresh();
}

export async function setAttributeValues(fd: FormData) {
  repo.setAttributeValues(
    id(fd, "object_id"),
    id(fd, "attribute_id"),
    optNum(fd, "min"),
    num(fd, "median"),
    optNum(fd, "max"),
  );
  refresh();
}
