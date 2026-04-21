
## Manual Two-Container Testing with Docker Compose

This workflow uses Docker Compose to manage both containers, configure credentials in n8n, and validate both auth modes manually.

### Prerequisites

- Docker installed
- A GitHub token with Copilot access
- This node available in your n8n instance

### 1) Set your GitHub token

```bash
export GITHUB_TOKEN=your_token_here
```

### 2) Start services with Docker Compose

From the `docs/tests/` directory:

```bash
cd docs/tests
docker-compose up -d
```

This builds the Copilot CLI image and starts both containers on an isolated private network.

### 3) Verify container-to-container reachability

```bash
docker-compose exec n8n sh -lc "wget -qO- http://copilot-cli:8080 >/dev/null && echo reachable || echo not-reachable"
```

Expected output: `reachable`

### 4) Access n8n

Open `http://localhost:5678` in your browser.

### 5) Test auth mode A: Server Token (Shared Service Account)

In n8n credentials:

- Authentication Mode: `server_token`
- CLI Server URL: `copilot-cli:8080`
- GitHub token field: leave empty

Manual checks:

1. Open model dropdown in the Copilot Agent node.
2. Run one prompt like: `Reply exactly with OK`.
3. Confirm output has `success: true` and a non-empty `response`.

### 6) Test auth mode B: GitHub Token (Per-User) against the same remote CLI

In n8n credentials:

- Authentication Mode: `github_token`
- CLI Server URL: `copilot-cli:8080`
- GitHub Personal Access Token: your PAT

Manual checks:

1. Open model dropdown in the Copilot Agent node.
2. Run one prompt like: `Reply exactly with OK`.
3. Confirm output has `success: true` and a non-empty `response`.

### 7) Clean up

```bash
docker-compose down
```

### Troubleshooting

- Model list fails to load:
  - Verify services are running: `docker-compose ps`
  - Verify URL is exactly `copilot-cli:8080`
  - Check CLI logs: `docker-compose logs copilot-cli`
- `server_token` mode fails:
  - Ensure `GITHUB_TOKEN` env var is set before starting services
  - Restart services: `docker-compose restart copilot-cli`
- `github_token` mode fails:
  - Ensure PAT is set in n8n credential and has Copilot access
- Connection errors:
  - Verify both containers are on the same network: `docker network inspect docs_tests_copilot-test-net`
  - Re-run reachability check from step 3