# n8n-nodes-copilot-agent

[![npm version](https://img.shields.io/npm/v/n8n-nodes-copilot-agent)](https://www.npmjs.com/package/n8n-nodes-copilot-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![CI](https://github.com/yashodhah/copilot-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/yashodhah/copilot-agent/actions/workflows/ci.yml)

A custom n8n node that integrates GitHub Copilot and other LLMs into your n8n workflows using the [GitHub Copilot SDK](https://github.com/github/copilot-sdk).

## Features

- **GitHub Copilot** - Use GitHub Copilot models directly in your workflows
- **Local or Remote CLI** - Spawn CLI locally or connect to a remote CLI server
- **Session Isolation** - Each item gets its own independent session by default; optionally share context across a batch
- **Multiple Models** - Support for GPT-5, Claude Sonnet 4.5, GPT-4.1, and more
- **AI Tool Compatible** - Use as a tool within n8n Agent nodes

## Requirements

- **n8n**: v2.16.0 or compatible
- **GitHub Copilot SDK**: v0.2.2 (included as dependency)
- **Node.js**: v18 or later
- **npm**: v9 or later
- **GitHub Copilot Subscription**: Required for API access (via PAT or server token)

## Installation

Install the node via npm in your n8n instance:

```bash
npm install n8n-nodes-copilot-agent
```

Or clone and build from source:

```bash
git clone https://github.com/yashodhah/copilot-agent.git
cd copilot-agent
npm install
npm run build
```

## Quick Start

1. Create a new workflow in n8n
2. Add the **Copilot Agent** node
3. Configure credentials (see [Authentication](#authentication) below)
4. Set the model and enter your prompt
5. Execute the workflow

## Authentication

The node supports two authentication modes. Choose the one that fits your deployment:

### 1. PAT

**Best for:** Small teams, per-user billing, individual Copilot subscriptions

The local CLI subprocess is started by the node, and each user provides their own GitHub Personal Access Token.

**Setup:**
1. Go to https://github.com/settings/tokens
2. Generate a new Personal Access Token (classic or fine-grained) with `copilot` scope
3. In the credential, select **Authentication Mode** → "PAT"
4. Paste your token in the "GitHub Personal Access Token" field
5. The node spawns the local CLI subprocess automatically

**Required token scopes:**
- `copilot` — access Copilot chat completions

**Pros:**
- No server setup required
- Per-user billing and attribution
- Works out-of-the-box for local development

**Cons:**
- Token stored in n8n (requires secure credential storage)
- Not suitable for large-scale shared deployments

### 2. Server Authenticated

**Best for:** Self-hosted n8n, shared deployments, service accounts

Connect to a remote CLI server that already has an API token in its environment. No PAT is stored in or passed from n8n.

**Setup:**
1. Start a Copilot CLI server with a token in the environment:
   ```bash
   export GITHUB_TOKEN=your_token_here
   copilot-cli --server 0.0.0.0:8080
   ```
2. In the credential, select **Authentication Mode** → "Server Authenticated"
3. Set "CLI Server URL" to your server address (e.g., `localhost:8080` or `copilot-server:8080`)
4. No token field is shown or required
5. The node connects and the server's environment token is used

**Pros:**
- Single shared token for all users
- Credentials never stored in n8n
- Scales across multiple n8n workers

**Cons:**
- Requires external CLI server
- No per-user billing/attribution
- Network must be secure (see [Network Security](#network-security) below)

## Local vs. Remote CLI

### Local CLI (Default)

When you choose **PAT**, the node spawns a local Copilot CLI subprocess automatically.

**Use for:**
- Local development
- Single-user workflows
- Desktop n8n instances

### Remote CLI Server

When you choose **Server Authenticated**, set **CLI Server URL** to connect to a remote CLI server instead.

**Use for:**
- Self-hosted n8n with multiple workers
- Shared CLI infrastructure
- Docker Compose / Kubernetes deployments

**Example setup (Docker):**
```bash
docker run -d \
  -e GITHUB_TOKEN=your_token_here \
  -p 8080:8080 \
  your-copilot-cli-image --server 0.0.0.0:8080
```

Then set **CLI Server URL** to `copilot-server:8080` (or your server's address).

## Network Security ⚠️

**CRITICAL:** The TCP connection between n8n and a remote CLI server is **unauthenticated** and transmits prompts and responses in plaintext.

### Protection Requirements

1. **Private Network Only**: Run the CLI server and n8n on the same private network:
   - Same Docker Compose network
   - Same Kubernetes pod network
   - Same VPC / private subnet
   - Corporate VPN or bastion host

2. **Never Expose Publicly**: Do NOT:
   - Expose CLI server port to the internet
   - Make CLI server accessible from untrusted networks
   - Route traffic through public internet without VPN/TLS

3. **Network Isolation**: Use firewall rules to restrict access:
   ```bash
   # Example: Allow only from n8n pod
   iptables -A INPUT -i docker0 -p tcp --dport 8080 -j ACCEPT
   iptables -A INPUT -p tcp --dport 8080 -j DROP
   ```

4. **Alternative**: If you need remote access, use:
   - SSH port forwarding: `ssh -L 8080:localhost:8080 user@remote-host`
   - VPN tunnel
   - mTLS wrapper (not built-in)

## Configuration Examples

### Example 1: Local GitHub Token
```json
{
   "authMode": "pat",
   "githubToken": "github_pat_xxxxxxxxxxxx"
}
```

### Example 2: Remote Service Account
```json
{
   "authMode": "server_authenticated",
  "cliUrl": "copilot-server:8080"
}
```

## Node Usage

### Inputs
- **Model**: Select the AI model to use (GPT-5, Claude Sonnet 4.5, GPT-4.1, etc.)
- **Prompt**: The message to send to the selected model
- **Share Session Across Items**: Toggle session isolation behaviour (see below)

### Outputs
- **success**: Boolean indicating if the request succeeded
- **response**: The model's response text
- **sessionId**: The session ID (useful for debugging or session tracking)
- **error**: Error message if the request failed (omitted on success)

### Session Isolation

The **Share Session Across Items** toggle controls how sessions are managed across a batch of input items:

| Setting | Behaviour | Best for |
|---------|-----------|----------|
| **Off** (default) | Each item gets its own independent session | Parallel/independent tasks, predictable results |
| **On** | All items share one session in sequence | Multi-turn conversations, context-aware chains |

**Isolated sessions (default):** Every input item starts a fresh conversation. Use this when items are independent and you want reproducible, isolated results.

**Shared session:** All items in the batch are sent to the same session in order. The model sees the full conversation history as context builds up. Use this for multi-turn workflows (e.g., summarize → critique → rewrite).

## Development

### Development Environment

- **TypeScript**: 5.9.3 (strict mode)
- **ESLint**: 9.39.4
- **Prettier**: 3.8.1
- **n8n Node CLI**: Latest (`@n8n/node-cli`)

### Build
```bash
npm run build
```

### Develop with Hot Reload
```bash
npm run dev
```

This starts n8n with the node loaded and watches for changes.

### Lint
```bash
npm run lint
npm run lint:fix
```

### Release
```bash
npm run release
```

This runs lint, build, prompts for a version bump, updates the changelog, commits, tags, and pushes — which triggers the publish workflow to publish to npm.

## Troubleshooting

### "GitHub token is required for PAT mode"
- Check that you've selected "PAT" auth mode and provided a token
- Verify the token has `copilot` scope at https://github.com/settings/tokens

### "CLI Server URL is required for Server Authenticated mode"
- Check that you've selected "Server Authenticated" auth mode and provided a `host:port` value
- Ensure you are pointing to a running remote CLI server

### "Failed to retrieve credentials"
- Ensure the credential is saved and attached to the node
- Re-enter the credential in n8n if it was migrated from another instance

### "Failed to connect to CLI server"
- Verify the CLI Server URL is correct (format: `host:port`, no `http://`)
- Check network connectivity: `telnet <host> <port>`
- Ensure the CLI server is running with a valid `GITHUB_TOKEN`

### Session or model errors
- Check that the selected model is available for your GitHub Copilot subscription tier
- Review the node execution logs for detailed error messages from the SDK

### Empty response
- Ensure your prompt is not empty — the node returns an error item for empty prompts
- Try a simpler prompt to rule out model-side issues

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository at https://github.com/yashodhah/copilot-agent
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and ensure `npm run lint && npm run build` pass
4. Commit with a descriptive message
5. Open a pull request against `main`

Please follow the existing code style (TypeScript strict mode, tabs, single quotes) and keep changes focused.

## References

- [GitHub Copilot SDK Documentation](https://github.com/github/copilot-sdk)
- [n8n Node Development Guide](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n Community Node Deployment](https://docs.n8n.io/integrations/creating-nodes/deploy/)
- [GitHub Personal Access Tokens](https://github.com/settings/tokens)

## License

[MIT](LICENSE.md) © 2026 yashodhah
