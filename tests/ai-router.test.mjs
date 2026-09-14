import test from "node:test";
import assert from "node:assert/strict";
import { generateAI } from "../app/services/ai/router.ts";
import { AIProviderError, AIUnavailableError } from "../app/services/ai/errors.ts";

const names=["gemini","groq","mistral","openrouter","cloudflare"];
const input={systemPrompt:"Bahasa Melayu Malaysia",userPrompt:"Jana OPR",responseFormat:"json"};
function setup(behaviour={}, order=names, extra={}) { const calls=[]; const providers=Object.fromEntries(names.map(name=>[name,{name,model:`${name}-model`,configured:behaviour[name]!=="skip",async generate(){calls.push(name);const action=behaviour[name];if(action instanceof Error)throw action;if(action==="timeout")return new Promise(()=>{});if(action==="malformed")return {text:"{broken",provider:name,model:`${name}-model`,latencyMs:1};return {text:JSON.stringify({provider:name}),provider:name,model:`${name}-model`,latencyMs:1}}}])); return {calls,providers,env:{AI_PROVIDER_ORDER:order.join(","),AI_MAX_RETRIES_PER_PROVIDER:"0",AI_REQUEST_TIMEOUT_MS:"10",...extra}}; }
const fail=()=>new AIProviderError("SERVER","down",503);

test("1 Gemini success does not call Groq",async()=>{const s=setup();assert.equal((await generateAI(input,s)).provider,"gemini");assert.deepEqual(s.calls,["gemini"])});
test("2 Gemini 429 falls back to Groq",async()=>{const s=setup({gemini:new AIProviderError("RATE_LIMIT","limited",429)});assert.equal((await generateAI(input,s)).provider,"groq")});
test("3 Gemini timeout falls back to Groq",async()=>{const s=setup({gemini:"timeout"});assert.equal((await generateAI(input,s)).provider,"groq")});
test("4 Gemini and Groq failure reaches Mistral",async()=>{const s=setup({gemini:fail(),groq:fail()});assert.equal((await generateAI(input,s)).provider,"mistral")});
test("5 three failures reach OpenRouter",async()=>{const s=setup({gemini:fail(),groq:fail(),mistral:fail()});assert.equal((await generateAI(input,s)).provider,"openrouter")});
test("6 four failures reach Cloudflare",async()=>{const s=setup({gemini:fail(),groq:fail(),mistral:fail(),openrouter:fail()});assert.equal((await generateAI(input,s)).provider,"cloudflare")});
test("7 all provider failures return friendly error",async()=>{const s=setup(Object.fromEntries(names.map(n=>[n,fail()])));await assert.rejects(()=>generateAI(input,s),e=>e instanceof AIUnavailableError&&e.message==="Perkhidmatan AI sedang mengalami gangguan sementara. Sila cuba semula.")});
test("8 missing Groq key skips without crash",async()=>{const s=setup({gemini:fail(),groq:"skip"});assert.equal((await generateAI(input,s)).provider,"mistral");assert.deepEqual(s.calls,["gemini","mistral"])});
test("9 malformed provider response falls back safely",async()=>{const s=setup({gemini:"malformed"});assert.equal((await generateAI(input,s)).provider,"groq")});
test("10 secrets use server-only names",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../.env.example",import.meta.url),"utf8")),assignments=source.split("\n").filter(line=>/^[A-Z][A-Z0-9_]*=/.test(line));assert.equal(assignments.some(line=>/^(NEXT_PUBLIC_|VITE_)/.test(line)),false);for(const key of ["GEMINI_API_KEY","GROQ_API_KEY","MISTRAL_API_KEY","OPENROUTER_API_KEY","CLOUDFLARE_API_TOKEN"])assert.match(source,new RegExp(`^${key}=`,"m"))});
