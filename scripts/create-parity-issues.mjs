#!/usr/bin/env node
/**
 * Creates release-hardening milestones and gap-tracking issues.
 * Idempotent: skips when an open issue with the same title already exists.
 */
import { execFileSync } from "node:child_process";

const REPO = "The-Allsparks/ftc-dev-tools";

function ghJson(args) {
  const out = execFileSync("gh", args, { encoding: "utf8" });
  return out.trim() ? JSON.parse(out) : null;
}

function gh(args, input) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

const milestones = [
  "0.1 Release Hardening",
  "0.2 Rookie Onboarding",
  "0.3 Diagnostics and Testing",
  "0.4 Debugging Investigation",
  "1.0 Hardware-Validated Release",
  "Future Integrations",
];

const existingMilestones = ghJson(["api", `repos/${REPO}/milestones`, "--paginate"]) || [];
const milestoneNumberByTitle = new Map(existingMilestones.map((m) => [m.title, m.number]));

for (const title of milestones) {
  if (milestoneNumberByTitle.has(title)) {
    console.log(`Milestone exists: ${title}`);
    continue;
  }
  const created = ghJson([
    "api",
    `repos/${REPO}/milestones`,
    "-f",
    `title=${title}`,
    "-f",
    "state=open",
  ]);
  milestoneNumberByTitle.set(title, created.number);
  console.log(`Created milestone: ${title} (#${created.number})`);
}

const existingIssues =
  ghJson([
    "issue",
    "list",
    "--repo",
    REPO,
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "number,title,state",
  ]) || [];
const existingTitles = new Set(existingIssues.map((i) => i.title));

function body(sections) {
  const lines = [];
  for (const [heading, text] of Object.entries(sections)) {
    lines.push(`## ${heading}`, "", text.trim(), "");
  }
  return lines.join("\n");
}

const issues = [
  {
    title: "Correct repository URLs and extension metadata",
    milestone: "0.1 Release Hardening",
    labels: ["bug"],
    sections: {
      "Problem statement":
        "Stale or incomplete repository/publisher/icon/metadata can break clones, schema URLs, and Marketplace packaging.",
      "User impact": "Students cannot install from documented URLs; schema validation URLs 404.",
      "Proposed scope":
        "Ensure all docs/package metadata point at The-Allsparks/ftc-dev-tools; extension icon and publisher documented.",
      "Non-goals": "Renaming npm scope or CLI binary.",
      "Implementation notes":
        "Covered largely by audit/android-studio-parity; keep identity CI green.",
      "Safety considerations": "None beyond avoiding fake org URLs.",
      "Test plan": "`npm run check:identity`; clone URL smoke check.",
      "Acceptance criteria":
        "No github.com/ftc-dev-tools/ftc-dev-tools references; repository fields valid; icon present.",
      Dependencies: "None",
      "Maturity level required": "Mock-tested",
    },
  },
  {
    title: "Add release validation command",
    milestone: "0.1 Release Hardening",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Releases need a single dry-run gate for metadata and packaging.",
      "User impact": "Broken VSIX/CLI artifacts or metadata reach users.",
      "Proposed scope":
        "`npm run release:check` validating versions, URLs, publisher, icon, licenses, changelog, packages.",
      "Non-goals": "Automatic Marketplace publish.",
      "Implementation notes": "scripts/release-check.mjs; wire into CI metadata job.",
      "Safety considerations": "Do not require publish secrets.",
      "Test plan": "Run release:check locally and in CI.",
      "Acceptance criteria": "Command fails on stale URLs / missing changelog / missing icon.",
      Dependencies: "Correct repository URLs issue",
      "Maturity level required": "Mock-tested",
    },
  },
  {
    title: "Verify Marketplace publisher and Open VSX strategy",
    milestone: "0.1 Release Hardening",
    labels: ["documentation"],
    sections: {
      "Problem statement":
        "publisher `ftc-dev-tools` may not be owned; Marketplace vs Open VSX differ.",
      "User impact": "Cannot publish extension; confusing install instructions.",
      "Proposed scope":
        "Confirm ownership; document claim steps; keep auto-publish disabled until confirmed.",
      "Non-goals": "Enabling CI publish in this issue.",
      "Implementation notes": "See docs/branding-and-publishing.md.",
      "Safety considerations": "Do not leak PATs.",
      "Test plan": "vsce ls-publishers / Marketplace UI verification by a maintainer.",
      "Acceptance criteria":
        "Documented owner decision; secrets listed; no auto-publish until verified.",
      Dependencies: "None",
      "Maturity level required": "Documentation",
    },
  },
  {
    title: "Create Android Studio / FTC for VS Code parity audit",
    milestone: "0.2 Rookie Onboarding",
    labels: ["documentation"],
    sections: {
      "Problem statement": "Need evidence-based matrix before speculative features.",
      "User impact": "Roadmap clarity for mentors and contributors.",
      "Proposed scope": "Maintain docs/parity-audit.md with classifications and actions.",
      "Non-goals": "Implementing every Android Studio feature.",
      "Implementation notes":
        "Update when features ship; cite FTC for VS Code implemented vs planned.",
      "Safety considerations": "Do not overclaim Control Hub parity.",
      "Test plan": "Doc link CI; review against Marketplace listing.",
      "Acceptance criteria":
        "Matrix covers build, setup, editing, snippets, debug, logs, tests, SDK, config, hub, telemetry.",
      Dependencies: "None",
      "Maturity level required": "Documentation",
    },
  },
  {
    title: "Add FTC Java snippets",
    milestone: "0.2 Rookie Onboarding",
    labels: ["enhancement"],
    sections: {
      "Problem statement":
        "FTC for VS Code provides snippets; FTC Dev Tools needs equivalent/better minimal set.",
      "User impact": "Rookies lack quick TeleOp/Auto/hardware scaffolding in-editor.",
      "Proposed scope":
        "Versioned generic Java snippets with ftc-* prefixes, provenance docs, tests.",
      "Non-goals": "Hundreds of season-specific snippets.",
      "Implementation notes": "packages/vscode-extension/snippets; docs/snippets.md.",
      "Safety considerations": "Include safe motor stop patterns.",
      "Test plan": "snippets.test.ts",
      "Acceptance criteria":
        "Required prefixes present; no team-specific packages; contributed by extension.",
      Dependencies: "None",
      "Maturity level required": "Mock-tested",
    },
  },
  {
    title: "Add SDK sample browser / import workflow",
    milestone: "Future Integrations",
    labels: ["enhancement"],
    sections: {
      "Problem statement":
        "Teams need current-season sample discovery without stale copied snippets.",
      "User impact": "Hard to find official samples for sensors/vision.",
      "Proposed scope":
        "Searchable browser tied to detected SDK version; track provenance/licensing; optional copy into TeamCode with confirm.",
      "Non-goals": "Bulk vendoring all samples into the extension.",
      "Implementation notes": "Prefer generating from installed SDK tree.",
      "Safety considerations": "Never overwrite TeamCode without confirmation/backup.",
      "Test plan": "Fixtures with sample trees; dry-run copy.",
      "Acceptance criteria": "SDK-version aware listing; licensed provenance documented.",
      Dependencies: "Parity audit",
      "Maturity level required": "Desktop integration tested",
    },
  },
  {
    title: "Add guided computer setup",
    milestone: "0.2 Rookie Onboarding",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Rookies struggle installing JDK/adb without Android Studio.",
      "User impact": "Blocked before first build.",
      "Proposed scope":
        "FTC: Set Up This Computer — non-destructive detection, explain gaps, trusted install paths, re-check, readiness report.",
      "Non-goals": "Silent system software installs.",
      "Implementation notes": "Wrap doctor + install-deps docs.",
      "Safety considerations": "Never silent install.",
      "Test plan": "Manual Windows VM; CI docs links.",
      "Acceptance criteria": "Command available; distinguishes required vs optional; OS guidance.",
      Dependencies: "None",
      "Maturity level required": "Desktop integration tested",
    },
  },
  {
    title: "Add guided FTC project setup",
    milestone: "0.2 Rookie Onboarding",
    labels: ["enhancement"],
    sections: {
      "Problem statement":
        "Projects lack consistent .vscode recommendations and safe .ftc-dev.json.",
      "User impact": "Inconsistent editing experience across laptops.",
      "Proposed scope":
        "FTC: Set Up This FTC Project with preview-before-write; no machine-local serials committed.",
      "Non-goals": "Committing preferred device serials.",
      "Implementation notes": "setup-commands.ts",
      "Safety considerations": "Preview required; redact local paths in shared files.",
      "Test plan": "Write into temp folder; ensure serials not written.",
      "Acceptance criteria":
        "Preview modal; extensions.json + safe settings; optional .ftc-dev.json.",
      Dependencies: "Recommended extensions docs",
      "Maturity level required": "Mock-tested",
    },
  },
  {
    title: "Improve package-aware Logcat filtering",
    milestone: "0.3 Diagnostics and Testing",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Current filters (teamcode/errors/raw) lack package/process awareness.",
      "User impact": "Noise makes TeamCode failures hard to find.",
      "Proposed scope":
        "Package/process filters and saved FTC-friendly filters; prefer output channel/tree over complex webview initially.",
      "Non-goals": "Full Android Studio Logcat clone webview first.",
      "Implementation notes": "Extend shared logcat parse/stream.",
      "Safety considerations": "No secret scraping into logs UI.",
      "Test plan": "Mock log lines; manual device test.",
      "Acceptance criteria": "Filter by RC package/process; saved FTC filters.",
      Dependencies: "None",
      "Maturity level required": "Android phone tested",
    },
  },
  {
    title: "Add clickable TeamCode stack traces",
    milestone: "0.3 Diagnostics and Testing",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Exceptions in Logcat do not open source locations.",
      "User impact": "Students cannot jump to failing lines.",
      "Proposed scope": "Parse stack frames and open TeamCode files/lines from extension output.",
      "Non-goals": "Full Android Studio hyperlink fidelity.",
      "Implementation notes": "Output channel link provider or Problems.",
      "Safety considerations": "Only open workspace files.",
      "Test plan": "Synthetic stack traces; phone RC throw.",
      "Acceptance criteria": "Thrown TeamCode exception opens file:line.",
      Dependencies: "Package-aware Logcat",
      "Maturity level required": "Android phone tested",
    },
  },
  {
    title: "Add redacted diagnostic bundles",
    milestone: "0.3 Diagnostics and Testing",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Hard to share support info without leaking secrets.",
      "User impact": "Mentors get incomplete or unsafe pastes.",
      "Proposed scope":
        "FTC: Create Diagnostic Bundle with preview; redacted doctor JSON, versions, sanitized structure, recent logs, device props, scrubbed .ftc-dev.json.",
      "Non-goals": "Including arbitrary source or Wi-Fi passwords.",
      "Implementation notes": "Require preview before share.",
      "Safety considerations":
        "Never include Wi-Fi passwords, tokens, unretracted home paths, full identifiers without approval.",
      "Test plan": "Unit tests for redaction; manual preview.",
      "Acceptance criteria": "Preview required; secrets stripped; user-controlled share.",
      Dependencies: "None",
      "Maturity level required": "Desktop integration tested",
    },
  },
  {
    title: "Add FTC unit-test starter workflow",
    milestone: "0.3 Diagnostics and Testing",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Teams lack guidance to test pure logic without a robot.",
      "User impact": "Fewer automated checks; harder CI for TeamCode.",
      "Proposed scope":
        "Docs + optional starter template + command to run FTC-relevant Gradle tests; recommend Java Test Runner; do not reinvent Test Explorer.",
      "Non-goals": "Custom test framework.",
      "Implementation notes": "Architecture separating I/O from logic.",
      "Safety considerations": "None hardware.",
      "Test plan": "Sample logic test in docs/examples.",
      "Acceptance criteria":
        "Sample logic testable without robot; failures via normal VS Code test tooling.",
      Dependencies: "Recommended extensions",
      "Maturity level required": "Desktop integration tested",
    },
  },
  {
    title: "Build physical deployment test matrix",
    milestone: "1.0 Hardware-Validated Release",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Deploy is mock-tested; Stable needs published physical matrix.",
      "User impact": "Risk of deploy failures on Control Hub / multi-device / OS combos.",
      "Proposed scope":
        "Matrix for Win/macOS/Linux × USB/Wi-Fi × Control Hub/phone × multi-device/unauthorized/offline/interrupted/low storage/signature conflict.",
      "Non-goals": "Auto-uninstall recovery.",
      "Implementation notes": "Use feature-maturity template without PII.",
      "Safety considerations": "Explicit device target; no destructive recovery.",
      "Test plan": "Fill matrix rows; publish in docs.",
      "Acceptance criteria": "Published matrix; cancellation predictable; target always explicit.",
      Dependencies: "None",
      "Maturity level required": "REV Control Hub tested",
    },
  },
  {
    title: "Investigate VS Code Java debugger attachment through JDWP",
    milestone: "0.4 Debugging Investigation",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Largest Android Studio gap; unsafe to promise without spike.",
      "User impact": "Teams want breakpoints; incorrect claims are dangerous.",
      "Proposed scope": "Complete docs/debugger-spike.md validation on hardware; go/no-go.",
      "Non-goals": "Shipping debugger before Control Hub validation.",
      "Implementation notes": "ADB JDWP + Java debugger attach; safety copy mandatory.",
      "Safety considerations":
        "Paused loops; motors may hold last command; no match use; emergency stop docs.",
      "Test plan": "Physical Control Hub + phone RC.",
      "Acceptance criteria":
        "Documented go/no-go; if go, attach reliable with safety UX; if no-go, improve non-pausing diagnostics.",
      Dependencies: "Physical deployment matrix (partial)",
      "Maturity level required": "REV Control Hub tested before any Stable claim",
    },
  },
  {
    title: "Harden SDK migration and rollback",
    milestone: "0.1 Release Hardening",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Need machine-readable plan/verify/rollback beyond dry-run + backups.",
      "User impact": "Failed updates are hard to reverse confidently.",
      "Proposed scope":
        "ftc sdk plan/verify/rollback; multi-version fixtures; git-based rollback when possible.",
      "Non-goals": "Touching TeamCode.",
      "Implementation notes": "Parse/validate build files; never regex-only.",
      "Safety considerations": "Dirty-tree guards; backups; explicit confirm.",
      "Test plan": "Fixtures across SDK versions.",
      "Acceptance criteria": "Dry-run matches writes; rollback restores; TeamCode untouched.",
      Dependencies: "None",
      "Maturity level required": "Desktop integration tested",
    },
  },
  {
    title: "Compare code hardware names with robot configuration",
    milestone: "0.3 Diagnostics and Testing",
    labels: ["enhancement"],
    sections: {
      "Problem statement":
        "Mismatch between hardwareMap strings and robot config causes runtime failures.",
      "User impact": "Confusing NullPointer/device-not-found at init.",
      "Proposed scope":
        "FTC: Compare Code Hardware Names to Robot Configuration — probable findings only.",
      "Non-goals": "Pushing config to hub; claiming dynamic names are fully knowable.",
      "Implementation notes": "Static analysis; mark findings probable.",
      "Safety considerations": "No config upload in this issue.",
      "Test plan": "Sample config + TeamCode fixtures.",
      "Acceptance criteria":
        "Detects missing/unused/type mismatch when inferable; documents limits.",
      Dependencies: "Robot config validate",
      "Maturity level required": "Desktop integration tested",
    },
  },
  {
    title: "Validate Control Hub OS update safety",
    milestone: "1.0 Hardware-Validated Release",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Hub OS helpers are high-risk and only mock-tested.",
      "User impact": "Brick/recovery risk if unsafe.",
      "Proposed scope":
        "Official sources only; checksum verification; explicit target confirm; battery warnings; no competition updates; recovery docs; keep experimental until validated.",
      "Non-goals": "Silent firmware flash; automatic apply.",
      "Implementation notes": "Physical tests; feature flags/experimental labels.",
      "Safety considerations": "Highest priority safety review.",
      "Test plan": "Control Hub physical checklist.",
      "Acceptance criteria": "Physical validation recorded; experimental cleared only after pass.",
      Dependencies: "Physical deployment matrix",
      "Maturity level required": "REV Control Hub tested",
    },
  },
  {
    title: "Investigate FTC Dashboard interoperability",
    milestone: "Future Integrations",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Telemetry dashboard interest without creating a proprietary ecosystem.",
      "User impact": "Teams already use FTC Dashboard; duplication confuses.",
      "Proposed scope":
        "Follow docs/telemetry-spike.md — detect/open existing dashboard; optional record/replay later.",
      "Non-goals": "Competition-illegal network assumptions; mandatory proprietary protocol.",
      "Implementation notes": "Optional commands only when detected.",
      "Safety considerations": "Competition network rules.",
      "Test plan": "Spike update after lab test.",
      "Acceptance criteria": "Written decision; optional integration only.",
      Dependencies: "Telemetry spike doc",
      "Maturity level required": "Desktop integration tested (then field)",
    },
  },
  {
    title: "Multi-version SDK update fixtures and sdk plan/verify/rollback CLI",
    milestone: "1.0 Hardware-Validated Release",
    labels: ["enhancement"],
    sections: {
      "Problem statement": "Preview graduation still needs deeper SDK hardening for Stable.",
      "User impact": "Season transitions remain risky.",
      "Proposed scope": "Expand fixtures; ship plan/verify/rollback commands.",
      "Non-goals": "Editing TeamCode automatically for API breaks.",
      "Implementation notes": "Related to Harden SDK migration issue; may merge if duplicate.",
      "Safety considerations": "TeamCode never modified.",
      "Test plan": "CI fixtures for multiple SDK tags.",
      "Acceptance criteria": "Commands documented; fixtures green in CI.",
      Dependencies: "Harden SDK migration and rollback",
      "Maturity level required": "Desktop integration tested",
    },
  },
];

const created = [];
for (const issue of issues) {
  if (existingTitles.has(issue.title)) {
    console.log(`Skip existing issue: ${issue.title}`);
    continue;
  }
  const milestone = milestoneNumberByTitle.get(issue.milestone);
  if (!milestone) {
    throw new Error(`Missing milestone ${issue.milestone}`);
  }
  const args = [
    "issue",
    "create",
    "--repo",
    REPO,
    "--title",
    issue.title,
    "--milestone",
    issue.milestone,
    "--body",
    body(issue.sections),
  ];
  const url = gh(args).trim();
  created.push(url);
  console.log(`Created ${url}`);
}

console.log(`Done. Created ${created.length} issues.`);
