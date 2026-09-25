import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { webcrypto } from "node:crypto";
import ts from "typescript";

const source = readFileSync(new URL("../app/lib/relief-delete-password.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;\n/gm, "").replace(/^export /gm, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;

function fixture(extraEnv = {}) {
  const sql = new DatabaseSync(":memory:");
  const db = { prepare(query) { let args = []; return { bind(...values) { args = values; return this; }, async first() { return sql.prepare(query).get(...args) || null; }, async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: Number(result.changes) } }; } }; } };
  return new Function("env", "crypto", compiled + "; return { verifyReliefDeletePassword, reliefDeletePasswordConfigured, initializeReliefDeletePassword, changeReliefDeletePassword };")({ DB: db, ...extraEnv }, webcrypto);
}

test("first setup enables deletion without accepting the relief PIN", async () => {
  const service = fixture({ RELIEF_ACCESS_PIN: "777777" });
  assert.equal(await service.reliefDeletePasswordConfigured(), false);
  assert.equal(await service.verifyReliefDeletePassword("777777"), false);
  assert.equal((await service.initializeReliefDeletePassword("secure-password-2026", "admin@example.test")).ok, true);
  assert.equal(await service.reliefDeletePasswordConfigured(), true);
  assert.equal(await service.verifyReliefDeletePassword("secure-password-2026"), true);
  assert.equal(await service.verifyReliefDeletePassword("wrong-password"), false);
  assert.equal((await service.initializeReliefDeletePassword("another-password-2026", "admin@example.test")).ok, false);
});

test("rotation requires the current password and revokes the old value", async () => {
  const service = fixture();
  await service.initializeReliefDeletePassword("old-secure-password", "admin@example.test");
  assert.equal((await service.changeReliefDeletePassword("wrong", "new-secure-password", "admin@example.test")).ok, false);
  assert.equal((await service.changeReliefDeletePassword("old-secure-password", "short", "admin@example.test")).ok, false);
  assert.equal((await service.changeReliefDeletePassword("old-secure-password", "new-secure-password", "admin@example.test")).ok, true);
  assert.equal(await service.verifyReliefDeletePassword("old-secure-password"), false);
  assert.equal(await service.verifyReliefDeletePassword("new-secure-password"), true);
});

test("a configured legacy secret works only before the first rotation", async () => {
  const service = fixture({ RELIEF_DELETE_PASSWORD: "legacy-password" });
  assert.equal(await service.reliefDeletePasswordConfigured(), true);
  assert.equal(await service.verifyReliefDeletePassword("legacy-password"), true);
  assert.equal((await service.changeReliefDeletePassword("legacy-password", "replacement-password", "admin@example.test")).ok, true);
  assert.equal(await service.verifyReliefDeletePassword("legacy-password"), false);
  assert.equal(await service.verifyReliefDeletePassword("replacement-password"), true);
});
