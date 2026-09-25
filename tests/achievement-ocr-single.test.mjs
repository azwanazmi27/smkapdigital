import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../app/api/achievement-ocr/route.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source.replace(/^import .*;\n/gm, "").replace(/^export /gm, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const makeRoute = (actor, aiText) => new Function("portalActor", "reserveAIUsage", "generateAI", code + ";return POST;")(
  async () => actor,
  async () => ({ usage: { day: "2026-09-25", used: 1, limit: null, remaining: null, exempt: true } }),
  async () => ({ text: aiText }),
);
const request = () => new Request("https://example.test/api/achievement-ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64: "QUJDRA==" }) });

test("single certificate OCR suggests only supported form values", async () => {
  const post = makeRoute({ role: "admin" }, JSON.stringify({ recipient: "Guru Contoh", title: "Kejohanan Catur", date: "2026-09-23", venue: "Dewan Ujian", level: "Daerah", field: "Sukan", unitCategory: "Kelab Catur", achievement: "Johan", confidence: 91 }));
  const result = await post(request());
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.field, "Sukan");
  assert.equal(data.unitCategory, "Kelab Catur");
  assert.equal(data.achievement, "Johan");
  assert.equal(data.recipient, "Guru Contoh");
});

test("certificate OCR requires login and rejects invented categories", async () => {
  const payload = JSON.stringify({ level: "Planet", field: "Rekaan", date: "esok", achievement: "Penyertaan" });
  assert.equal((await makeRoute(null, payload)(request())).status, 401);
  const response = await makeRoute({ role: "teacher" }, payload)(request());
  const data = await response.json();
  assert.equal(data.level, "");
  assert.equal(data.field, "");
  assert.equal(data.date, "");
});
