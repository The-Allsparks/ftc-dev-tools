# Sample vision workspace files

Copy these patterns into a real FTC Android Studio project (with `settings.gradle`, `TeamCode`, Gradle Wrapper). This folder is **documentation only** — not a buildable project.

## Files

| File                                 | Purpose                               |
| ------------------------------------ | ------------------------------------- |
| `.ftc-dev.json.example`              | Limelight + pipeline directory config |
| `limelight/pipelines/pipeline0.json` | Minimal valid pipeline slot 0         |

## Usage

1. Copy `.ftc-dev.json.example` → your project root as `.ftc-dev.json`
2. Adjust `teamNumber`, `limelight.host`, and paths
3. Copy `limelight/pipelines/` under your repo if using pipeline-as-code
4. Run:

```bash
ftc vision status --json
ftc vision limelight pipelines validate --json
```

## Do not commit secrets

Replace example IPs before pushing to a public GitHub repo. Use `.gitignore` for machine-local serial preferences.
