# PlannerAI Demo

## Build for publishing

Generate the deployment package with Node.js:

```sh
node scripts/build-demo-dist.mjs
```

Configure the hosting platform to publish **`dist/` only**. Never publish the
repository root. The build copies only the explicitly approved Demo files and
fails if the output contains `docs/`, Excel/Word files, Excel temporary files,
or any file not listed in the allowlist.

To validate an existing package immediately before upload, run:

```sh
node scripts/build-demo-dist.mjs --verify-only
```

The local `docs/` directory is not part of the deployment package. The single
Excel workbook explicitly allowed by `.gitignore` is available for Codex
workspace references but should remain uncommitted when the repository is
public.
