This repository contains an n8n community node implemented in TypeScript (`strict` mode) for the GitHub Copilot SDK.

When making changes:
- Keep edits minimal and scoped to the requested behavior.
- Preserve n8n node patterns (`NodeOperationError`, `pairedItem`, credential test + `execute` parity).
- Ensure Copilot client/session lifecycle safety (`start`/`stop`, `createSession`/`resumeSession`, `disconnect` in `finally`).
- Prefer existing npm scripts for verification (`npm run lint`, `npm run build`).
- Do not introduce new dependencies unless absolutely necessary.
