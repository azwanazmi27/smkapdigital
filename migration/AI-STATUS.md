# AI migration status — 22 September 2026

All five source adapters are retained: Gemini, Groq, Mistral, OpenRouter and Cloudflare AI. Default source order is gemini,groq,mistral,openrouter,cloudflare; the actual production environment override and all active credentials remain unverified.

| Provider | Staging status |
|---|---|
| Gemini | User created staging key, but its new-format value was inadvertently emitted during UI inspection. No value stored in repository or this report. Replacement attempted and rejected by Google: “The request is suspicious.” Original portal key untouched. |
| Groq | Existing account login required; login page explicitly includes acceptance of Services Agreement. No key created. |
| Mistral | Existing account login required. No key created. |
| OpenRouter | Sign-in page, with action-failed message. No key created. |
| Cloudflare AI | Runtime AI credential still absent. GitHub deployment token is not an AI token and will not be reused. |

Validation: 20/20 focused AI routing and evidence tests passed using `node --import tsx --test tests/ai-router.test.mjs tests/evidence-ai.test.mjs`. These are local mocked tests, not live provider validation. Initial invocation without tsx failed module resolution; corrected invocation passed. No real school data sent and no billing enabled. AI staging routes remain disabled pending safe credential setup and synthetic end-to-end verification.

Next steps: complete Gemini replacement through user interaction; sign in to existing provider accounts; verify model availability, quotas and billing before creating credentials; store provider credentials only as Worker secrets; retain original fallback order; test each provider and fallback with synthetic inputs before reporting live PASS.


## 2026-09-22 — Three staging provider credentials configured
After explicit user approval, created smkapdigital-staging keys in Groq Personal/Default Project, Mistral Default Workspace and OpenRouter Default Workspace. All expire 2026-10-22; Mistral Shared connectors only; OpenRouter credit limit USD 0. Transferred directly in browser memory to encrypted Worker secrets GROQ_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY. Cloudflare settings verified all three as Value encrypted. Secret variables nulled after transfer; no key values written to this repository or logs. Existing portal keys untouched. No billing activation or credit purchase. Live provider calls still NOT TESTED and AI staging routes still blocked. Gemini replacement and Cloudflare AI runtime credential remain unresolved.


## Live staging AI health verification
Commit 5c6f30e enabled only GET /api/ai/health in isolated staging. GitHub Actions run 35738424778 succeeded and deployed. Live response at https://smkapdigital-staging.smkapdigital.workers.dev/api/ai/health: Gemini online, Groq online, Mistral online, OpenRouter online, Cloudflare offline. This is provider configuration/health status, not a generation call. AI generation routes remain blocked until an authenticated synthetic end-to-end test is performed; Cloudflare AI remains unavailable because no Workers AI runtime credential/binding is configured.


## Live synthetic AI generation result
Authenticated staging super_admin session submitted synthetic e-Panitia Minit Mesyuarat prompt. UI returned generic temporary AI outage after fallback. Admin AI status recorded: Gemini Offline SERVER (0/2), Groq Offline BAD_REQUEST (0/1), Mistral Offline RATE_LIMIT (0/2), OpenRouter Offline AUTH (0/1), Cloudflare Offline API_KEY_MISSING (0/0). No school data used and no document saved. Health endpoint configuration status is therefore insufficient; live generation is FAIL/BLOCKED pending provider-specific credential/model/API compatibility fixes.
## Model pin follow-up

Staging now pins Gemini to `gemini-2.5-flash` and Groq to `llama-3.3-70b-versatile` (commit `19b0dd1`, workflow `35739856177` succeeded). Post-deployment health remains Gemini/Groq/Mistral/OpenRouter online and Cloudflare offline. A fresh authenticated generation test is still required; no claim of live generation success is made.

## 2026-09-23 production provider audit

The deployed production Worker `portal` reports `cloudflare=online` and `gemini`, `groq`, `mistral`, `openrouter=offline` at `/api/ai/health`. Its settings show the `AI` Workers AI binding and `CLOUDFLARE_AI_BINDING=1`, but none of the four external provider API-key secrets. A prior synthetic Cloudflare AI generation passed; this does not validate any external provider. The 20 focused local AI tests pass with mocked providers, not live credentials.

Existing Groq, Mistral and OpenRouter keys are staging-only and expire 2026-10-22. Mistral staging generation returned `RATE_LIMIT`; OpenRouter's staging key has a USD 0 key limit, and the account displayed USD 0 available credits. A new production key must be created per provider, stored as a Worker secret, and verified using synthetic generation before marking PASS. Do not reuse the exposed Gemini staging key. Google AI Studio currently fails to list projects/keys, and the Cloud Console project prompts for school-account reauthentication. No production key has been created or configured.

For a no-purchase OpenRouter path, the official free-model router is `openrouter/free`; free-account limits are low (currently 50 requests/day and 20 requests/minute). A USD 0 key limit may still reject even free models, so that route requires a new limited key and a live test. Do not point a new unbounded key at the current paid default model `openai/gpt-oss-20b`. Sources: https://openrouter.ai/collections/free-models and https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/ .

## 2026-09-23 production synthetic verification

- With action-time approval, created new production Groq and Mistral keys expiring 2026-12-22. The Mistral key retains the default Shared connectors only scope. Stored both as encrypted Cloudflare Worker secrets without recording values in the repository. Cloudflare health then changed to `groq=online`, `mistral=online`.
- Created a separate OpenRouter production key after the account owner completed email verification. It expires 2026-12-22 and has a USD 1 total key limit; the account displayed USD 0 available credits, and no credits were purchased. Configured the Worker variable `OPENROUTER_MODEL=openrouter/free` and the encrypted key. Health changed to `openrouter=online`. The free router is limited and is a fallback, not a capacity guarantee.
- Signed into production with the registered school test account and submitted only fictional e-Panitia Minit Mesyuarat notes. The resulting unsaved draft was generated successfully by Groq. Admin metrics recorded Groq `1 / 0`, 1525 ms, no error.
- Temporarily placed Mistral then OpenRouter first for a second fictional prompt. Mistral recorded `0 / 2` with `RATE_LIMIT`; OpenRouter recorded `1 / 0`, and the draft appeared. The temporary provider order was then restored to `gemini,groq,mistral,openrouter,cloudflare` and verified in the admin panel. No synthetic document was saved. The current Worker version prefix is `2322e97c`; the earlier version prefix `b92852a3` is a rollback reference for the AI changes.
- Google AI Studio loaded the imported `oprsmkap` Free-tier project, but creation of a separate Gemini production key failed with `Failed to generate API key, The request is suspicious. Please try again.` No Gemini key was copied or installed. Existing school and staging keys were left unchanged.
- Final public checks: `/` HTTP 200, unauthenticated `/api/drive` HTTP 401, `/api/ai/health` reports Gemini offline and the other four configured online. “Online” is configuration status only: Groq and OpenRouter passed live generation, Cloudflare AI passed an earlier synthetic generation, Mistral failed, and Gemini was not tested with a production key.
- After the user asked whether the old/staging Gemini key could be reused, repeated a fictional prompt on isolated staging with `gemini-2.5-flash` pinned. The UI again returned the generic temporary AI outage, so this key has not produced a verified successful generation. The admin counter was `0 / 0` on the subsequent read, likely because metrics are process-local; it cannot identify a reliable provider-specific reason for this attempt. Do not promote the staging key, which was previously exposed, to production.
