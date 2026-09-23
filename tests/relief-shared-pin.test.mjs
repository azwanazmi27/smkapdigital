import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";

const source = readFileSync(new URL("../app/lib/relief-pin.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import .*;\n/gm, "").replace(/^export /gm, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const routeSource = readFileSync(new URL("../app/api/relief-pin/route.ts", import.meta.url), "utf8");
const routeCode = ts.transpileModule(routeSource.replace(/^import .*;\n/gm, "").replace(/^export /gm, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;

function fixture() {
  const sql = new DatabaseSync(":memory:");
  const db = { prepare(query) { let args = []; return { bind(...values) { args = values; return this; }, async first() { return sql.prepare(query).get(...args) || null; }, async run() { return sql.prepare(query).run(...args); } }; } };
  const service = new Function("env", compiled + "; return { verifyReliefPin, changeReliefPin };")({ DB: db, RELIEF_ACCESS_PIN: "123456" });
  return { ...service, sql };
}

test("same configured PIN works initially, then only the changed PIN works", async () => {
  const service = fixture();
  assert.equal(await service.verifyReliefPin("123456"), true);
  assert.equal(await service.verifyReliefPin("000000"), false);
  assert.equal((await service.changeReliefPin("000000", "654321", "admin@example.test")).ok, false);
  assert.equal((await service.changeReliefPin("123456", "654321", "admin@example.test")).ok, true);
  assert.equal(await service.verifyReliefPin("123456"), false);
  assert.equal(await service.verifyReliefPin("654321"), true);
  const row = service.sql.prepare("SELECT salt,pin_hash,updated_by FROM relief_pin_settings WHERE id='shared'").get();
  assert.equal(row.updated_by, "admin@example.test");
  assert.notEqual(row.pin_hash, "654321");
  assert.notEqual(row.salt, "");
});

test("changing a shared PIN requires a signed-in portal admin", async () => {
  let actor = null;
  let called = false;
  const { POST } = new Function("portalActor", "changeReliefPin", routeCode + "; return { POST };")(
    async () => actor,
    async () => { called = true; return { ok: true }; },
  );
  const request = () => new Request("https://example.test/api/relief-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPin: "123456", newPin: "654321" }) });
  assert.equal((await POST(request())).status, 403);
  actor = { role: "teacher", email: "teacher@example.test" };
  assert.equal((await POST(request())).status, 403);
  assert.equal(called, false);
  actor = { role: "admin", email: "admin@example.test" };
  assert.equal((await POST(request())).status, 200);
  assert.equal(called, true);
});
