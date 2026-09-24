import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";

const source = readFileSync(new URL("../app/lib/relief-delete-password.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;\n/gm, "").replace(/^export /gm, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;

function fixture(extraEnv = {}) {
  const sql = new DatabaseSync(":memory:");
  const db = { prepare(query) { let args = []; return { bind(...values) { args = values; return this; }, async first() { return sql.prepare(query).get(...args) || null; }, async run() { return sql.prepare(query).run(...args); }, async all() { return { results: sql.prepare(query).all(...args) }; } }; } };
  return new Function("env", "verifyReliefPin", compiled + "; return { verifyDeletePassword, setDeletePassword, deletePasswordStatus };")({ DB: db, ...extraEnv }, async (pin) => pin === "123456");
}

test("shared PIN works until a delete password is set", async () => {
  const service = fixture();
  assert.equal(await service.verifyDeletePassword("123456"), true);
  assert.equal(await service.verifyDeletePassword("salah"), false);
  assert.equal((await service.setDeletePassword("delete", "padam2026", "admin@example.test")).ok, true);
  assert.equal(await service.verifyDeletePassword("padam2026"), true);
  assert.equal(await service.verifyDeletePassword("123456"), false);
});

test("master password always works after delete password changes", async () => {
  const service = fixture();
  await service.setDeletePassword("master", "master-smkap", "admin@example.test");
  await service.setDeletePassword("delete", "satu", "admin@example.test");
  await service.setDeletePassword("delete", "dua2", "admin@example.test");
  assert.equal(await service.verifyDeletePassword("satu"), false);
  assert.equal(await service.verifyDeletePassword("dua2"), true);
  assert.equal(await service.verifyDeletePassword("master-smkap"), true);
  const status = await service.deletePasswordStatus();
  assert.equal(status.master.updated_by, "admin@example.test");
  assert.equal((await service.setDeletePassword("other", "abcd", "x")).ok, false);
  assert.equal((await service.setDeletePassword("delete", "abc", "x")).ok, false);
});

test("configured env secrets still work", async () => {
  const service = fixture({ RELIEF_DELETE_PASSWORD: "envpass", RELIEF_MASTER_PASSWORD: "envmaster" });
  assert.equal(await service.verifyDeletePassword("envpass"), true);
  assert.equal(await service.verifyDeletePassword("envmaster"), true);
});
