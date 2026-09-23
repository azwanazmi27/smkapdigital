# Operating cost assumptions — checked 23 September 2026

Current account status supersedes the historical wording below: Workers **Free** is active, while the R2 usage-billed subscription was activated with explicit user approval. No Workers Paid plan, domain purchase, or Images service was activated. The production Worker uses a Workers AI binding for text generation. Actual monthly charges cannot be calculated until measured storage, operation counts, traffic, and external provider usage are known.

- Workers Free allows 100,000 requests/day and 10 ms CPU time per invocation under the standard pricing table; over-limit behavior must be monitored. [Official Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- D1 Free includes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. [Official D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- R2 Standard's monthly free allowance is 10 GB-month, 1 million Class A operations and 10 million Class B operations; usage beyond the allowance is billable on the active R2 subscription. Direct R2 egress is free. [Official R2 pricing](https://developers.cloudflare.com/r2/pricing/).
- Workers AI includes 10,000 Neurons/day at no charge on Workers Free. Excess on Free fails; paid usage requires Workers Paid, which has not been activated. The currently selected model must remain eligible for Free. [Official Workers AI pricing, updated 17 September 2026](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- Google Workspace, Apps Script, Sheets, Drive and the other AI providers retain their own quotas/billing. No assumption of free or unlimited use.

## Historical pre-activation assumptions (22 September 2026)

No paid plan, domain purchase, R2 subscription or Images service was activated. Actual cost is not established because production storage size, traffic, CPU usage, provider quotas and paid-account eligibility remain unverified.

- Workers static asset requests are free; dynamic Worker invocations follow Workers pricing. Free plan has daily/runtime limits; paid plan starts at USD 5/month. Local build success does not prove this app fits the free CPU or bundle limit. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [limits](https://developers.cloudflare.com/workers/platform/limits/).
- D1 Free includes 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Exceeding free limits causes failures rather than automatic extra capacity. Source/destination copies and staging count toward storage. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- R2 Standard includes 10 GB-month, 1 million Class A and 10 million Class B operations per month. Beyond included usage: USD 0.015/GB-month, USD 4.50/million Class A and USD 0.36/million Class B; egress is free. Target R2 is not activated. Billing activation is a separate decision even if expected usage is within the free allowance. [R2 pricing](https://developers.cloudflare.com/r2/pricing/).
- Google Workspace/Drive/Sheets/Apps Script and external AI subscriptions remain with current providers; no assumption of free or unlimited use. Their present billing configuration and quotas have not been verified.
- workers.dev avoids purchasing a custom domain. No DNS or email configuration changes are needed for the currently authorized naming choice. [workers.dev routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
- GitHub validation runs on migration-branch pushes or manual dispatch; one clean validation run passed. Actions allowance/overage and Cloudflare build-minute allowance remain unverified; automatic deployment is not enabled. [Cloudflare Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

Architecture references: [Cloudflare vinext guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/).
