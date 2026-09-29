# Security Policy

## 🔒 Disclosure Protocol

Yasaura takes security with the same discipline it takes performance: **non-negotiable, immediate, and measured at the edge**.

We welcome and reward responsible disclosure from independent researchers. This document defines the scope, process, and rewards for security disclosure against the Yasaura Engine public edge mirror.

---

## 📍 Scope

### In Scope

The following surfaces are eligible for disclosure and reward:

- This repository's published code (rendering paths, edge middleware, build pipeline)
- The public storefront delivery surface (`*.yasaura.com` customer-facing edges)
- Edge CDN cache poisoning, smuggling, or boundary violations
- Public GraphQL query surfaces and schema introspection
- Content Security Policy (CSP) bypasses
- Subresource Integrity (SRI) failures
- Build artifact integrity or signing chain weaknesses

### Out of Scope

- The private commerce engine monorepo (not externally accessible by design)
- Payment processing pipelines (PCI-scoped, isolated infrastructure)
- Internal admin tooling, CMS, or operator surfaces
- Customer PII handling (separated infrastructure)
- Social engineering against Yasaura personnel
- Physical security of Yasaura facilities
- DDoS or volumetric attacks
- Issues requiring physical access to a customer device
- Reports generated solely by automated scanners without proof of impact
- Theoretical vulnerabilities without a working proof-of-concept

---

## 🚨 Severity Classification

| Severity | Definition | Examples |
| :--- | :--- | :--- |
| **Critical** | Direct compromise of customer data, payment integrity, or full edge takeover | RCE on edge, signing key extraction, payment redirection |
| **High** | Significant impact requiring user interaction or specific conditions | Stored XSS, authentication bypass, cache poisoning at scale |
| **Medium** | Limited impact, requires non-trivial conditions | Reflected XSS, CSP bypass without exploitable sink, IDOR with low impact |
| **Low** | Minor issues with negligible direct impact | Missing security headers, verbose error messages, low-impact information disclosure |
| **Informational** | Best-practice recommendations | Outdated dependency without known exploit, configuration improvements |

---

## 📬 Reporting a Vulnerability

### Preferred Channel

Email: **`security@yasaura.com`**

Encrypt your report with our PGP key (fingerprint below). Plaintext reports are accepted but discouraged for high-severity findings.

```
PGP Fingerprint: [Available on request via security@yasaura.com]
Key servers: keys.openpgp.org
```

### Required Information

To accelerate triage, please include:

1. **Affected surface** — URL, endpoint, or code path
2. **Vulnerability class** — XSS, SSRF, CSRF, etc.
3. **Severity assessment** — your estimate, using the table above
4. **Reproduction steps** — exact, ordered, copy-paste runnable
5. **Proof of concept** — minimal, non-destructive
6. **Impact analysis** — what a real attacker could achieve
7. **Suggested remediation** — optional but appreciated
8. **Your handle** — for credit (or "anonymous")

### What Happens Next

| Stage | Timeline | What We Do |
| :--- | :---: | :--- |
| **Acknowledgment** | < 24 hours | Confirm receipt, assign tracking ID |
| **Triage** | < 72 hours | Validate, classify severity, scope impact |
| **Investigation** | < 7 days | Internal root cause analysis, fix design |
| **Remediation** | Severity-dependent | Critical: < 7 days · High: < 30 days · Medium: < 90 days · Low: best effort |
| **Disclosure** | Coordinated | Joint timeline agreed with reporter |
| **Reward** | Within 14 days of fix | Per the schedule below |

---

## 💰 Reward Schedule

Rewards are issued for valid, in-scope findings with reproducible proof-of-concept. Rewards scale with severity, exploitability, and report quality.

| Severity | Reward Range (USD) |
| :--- | :---: |
| **Critical** | $5,000 – $25,000 |
| **High** | $1,500 – $5,000 |
| **Medium** | $500 – $1,500 |
| **Low** | $100 – $500 |
| **Informational** | Recognition + swag |

### Reward Multipliers

- **+25%** — Exceptional report quality (clear writing, clean PoC, accurate impact analysis)
- **+50%** — Novel vulnerability class or chained exploit
- **+100%** — Full exploit chain demonstrating critical impact

### Reward Reductions

- **−50%** — Duplicate of an in-progress internal finding
- **−50%** — Public disclosure before coordinated timeline
- **Disqualified** — Out-of-scope, theoretical without PoC, automated scanner output, or violations of the safe harbor terms below

---

## 🤝 Safe Harbor

We will not pursue legal action against researchers who:

- ✅ Make a **good-faith effort** to avoid privacy violations, service disruption, or data destruction
- ✅ Operate **only against in-scope surfaces** as defined above
- ✅ **Do not exfiltrate** customer data beyond what is strictly necessary to demonstrate impact
- ✅ **Do not publicly disclose** before the coordinated timeline
- ✅ **Comply with applicable laws** in their jurisdiction
- ✅ **Report findings** through `security@yasaura.com` and not via public channels

We will work with you to understand and resolve issues quickly. If legal action is initiated against you by a third party for activities conducted in compliance with this policy, we will make it known that your actions were authorized.

---

## 🚫 Strictly Prohibited

The following will void safe harbor and may result in legal action:

- ❌ Accessing, modifying, or destroying customer data
- ❌ Interrupting service for other customers (DoS, resource exhaustion)
- ❌ Phishing, social engineering, or physical attacks against Yasaura personnel
- ❌ Public disclosure prior to the coordinated timeline
- ❌ Extortion, ransom demands, or threats
- ❌ Testing against third-party services or vendors integrated with Yasaura
- ❌ Using vulnerabilities for any purpose beyond demonstration

---

## 🏆 Hall of Fame

Researchers who report valid findings are credited (with permission) in our public Hall of Fame, refreshed quarterly. Top contributors annually receive:

- Direct access to senior security engineering
- Early access to scope expansions
- Yasaura recognition and brand collaborations

---

## 📞 Other Security Contacts

| Inquiry | Contact |
| :--- | :--- |
| 🔒 Vulnerability disclosure | `security@yasaura.com` |
| 📋 Compliance & audit | `audit@yasaura.com` |
| ⚖️ Legal & DMCA | `legal@yasaura.com` |
| 🤝 Security partnerships | `security-partnerships@yasaura.com` |

---

## 📜 Policy Versioning

This policy is versioned and changes are logged. Material changes will be announced in the repository's release notes.

**Current version:** `2026.9`
**Last reviewed:** September 2026
**Next scheduled review:** December 2026

---

<div align="center">

**Yasaura takes security as seriously as it takes speed.**

*Both are non-negotiable. Both are measured. Both are gated.*

</div>
