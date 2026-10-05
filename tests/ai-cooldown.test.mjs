import test from 'node:test';
import assert from 'node:assert/strict';
import {retryAfterMs} from '../app/services/ai/errors.ts';
test('honors provider cooldown including fractional seconds from Groq',()=>{assert.equal(retryAfterMs(null,'Please try again in 11.0175s.'),11268);assert.equal(retryAfterMs('12'),12250);assert.equal(retryAfterMs(null,'Please try again in 1m'),60000);assert.equal(retryAfterMs(null,'other error'),undefined);assert.equal(retryAfterMs('Wed, 01 Jan 2025 00:00:10 GMT','',Date.parse('2025-01-01T00:00:00Z')),10250);});
test('router waits for supplied cooldown then recovers on the same provider',async()=>{
 const {generateAI}=await import('../app/services/ai/router.ts');const {AIProviderError}=await import('../app/services/ai/errors.ts');let calls=0;let first=0,second=0;
 const result=await generateAI({systemPrompt:'Return JSON',userPrompt:'test',responseFormat:'json'},{env:{AI_PROVIDER_ORDER:'groq',AI_MAX_RETRIES_PER_PROVIDER:'1',AI_REQUEST_TIMEOUT_MS:'1000'},providers:{groq:{name:'groq',model:'test',configured:true,async generate(){if(++calls===1){first=Date.now();throw new AIProviderError('RATE_LIMIT','wait',429,30);}second=Date.now();return {text:'{}',model:'test',provider:'groq',latencyMs:0};}}}});
 assert.equal(result.provider,'groq');assert.equal(calls,2);assert.ok(second-first>=25);
});
