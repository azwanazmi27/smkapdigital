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
