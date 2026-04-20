# n8n-nodes-copilot-agent

A custom n8n node that integrates GitHub Copilot and other LLMs into your n8n workflows using the [GitHub Copilot SDK](https://github.com/github/copilot-sdk).

## Features

- **GitHub Copilot** - Use GitHub Copilot models directly in your workflows
- **Bring Your Own Key (BYOK)** - Use OpenAI, Azure OpenAI, or Anthropic API keys instead
- **Local or Remote CLI** - Spawn CLI locally or connect to a remote CLI server
- **Session Context** - Maintains conversation history across multiple prompts
- **Multiple Models** - Support for GPT-5, Claude Sonnet 4.5, GPT-4.1, and more

## Installation

Install the node via npm:

```bash
npm install n8n-nodes-copilot-agent
```

Or clone and build from source:

```bash
git clone https://github.com/yourusername/n8n-nodes-copilot-agent.git
cd n8n-nodes-copilot-agent
npm install
npm run build
```

## Quick Start

1. Create a new workflow in n8n
2. Add the "Copilot Agent" node
3. Configure credentials (see [Authentication](#authentication) below)
4. Set the model and enter your prompt
5. Execute the workflow

## Authentication

The node supports four authentication modes. Choose the one that fits your deployment:

### 1. GitHub Token (Per-User)

**Best for:** Small teams, per-user billing, individual Copilot subscriptions

The most straightforward option. Each user provides their own GitHub Personal Access Token.

**Setup:**
1. Go to https://github.com/settings/tokens
2. Generate a new Personal Access Token (classic or fine-grained) with `copilot` scope
3. In the credential, select **Authentication Mode** → "GitHub Token (Per-User)"
4. Paste your token in the "GitHub Personal Access Token" field
5. Leave "CLI Server URL" empty to spawn CLI locally (default)

**Pros:**
- No server setup required
- Per-user billing and attribution
- Works out-of-the-box for local development

**Cons:**
- Token stored in n8n (requires secure credential storage)
- Not suitable for large-scale shared deployments

### 2. Server Token (Shared Service Account)

**Best for:** Self-hosted n8n, shared deployments, service accounts

Connect to a remote or local CLI server that already has an API token in its environment variable. No credentials are passed—the server's token is used automatically.

**Setup:**
1. Start a Copilot CLI server with a token in the environment:
   ```bash
   export GITHUB_TOKEN=your_token_here
   copilot-cli --server 0.0.0.0:8080
   ```
2. In the credential, select **Authentication Mode** → "Server Token (Shared Service Account)"
3. Set "CLI Server URL" to your server address (e.g., `localhost:8080` or `copilot-server:8080`)
4. No other fields need to be filled
5. The node connects and the server's environment token is used

**Pros:**
- Single shared token for all users
- Credentials never stored in n8n
- Scales across multiple n8n workers

**Cons:**
- Requires external CLI server
- No per-user billing/attribution
- Network must be secure (see [Network Security](#network-security) below)

### 3. BYOK — OpenAI

**Best for:** Organizations using their own OpenAI subscription

Use your own OpenAI API key instead of GitHub Copilot.

**Setup:**
1. Get your API key from https://platform.openai.com/account/api-keys
2. In the credential, select **Authentication Mode** → "BYOK — OpenAI"
3. Enter your OpenAI API key in the "OpenAI API Key" field
4. No CLI URL or GitHub token needed
5. (Optional) If using a remote CLI server configured for OpenAI, set "CLI Server URL"

**Pros:**
- No GitHub Copilot subscription required
- Direct access to OpenAI models
- Full control over billing

**Cons:**
- Requires OpenAI subscription
- OpenAI API key stored in n8n (requires secure credential storage)

### 4. BYOK — Azure OpenAI

**Best for:** Enterprise environments with Azure

Use your Azure OpenAI service instead of GitHub Copilot.

**Setup:**
1. Set up an Azure OpenAI resource in your Azure account
2. Get your API key and endpoint from Azure Portal
3. In the credential, select **Authentication Mode** → "BYOK — Azure OpenAI"
4. Enter your API key in "Azure OpenAI API Key"
5. Enter your endpoint (e.g., `https://my-resource.openai.azure.com`) in "Azure OpenAI Endpoint"
6. (Optional) If using a remote CLI server, set "CLI Server URL"

**Pros:**
- Enterprise-grade security and compliance
- Works within Azure VNets
- No GitHub Copilot subscription required

**Cons:**
- Requires Azure account setup
- Credentials stored in n8n
- More complex infrastructure

### 5. BYOK — Anthropic

**Best for:** Organizations using Claude / Anthropic API

Use Anthropic's Claude models via the Anthropic API.

**Setup:**
1. Get your API key from https://console.anthropic.com
2. In the credential, select **Authentication Mode** → "BYOK — Anthropic"
3. Enter your Anthropic API key in the "Anthropic API Key" field
4. No CLI URL or GitHub token needed

**Pros:**
- Direct access to Claude models
- No GitHub Copilot subscription required
- Full control over billing

**Cons:**
- Requires Anthropic subscription
- Anthropic API key stored in n8n

## Local vs. Remote CLI

### Local CLI (Default)

When you leave **CLI Server URL** empty, the node spawns a local Copilot CLI subprocess automatically. This is the default and simplest option.

**Use for:**
- Local development
- Single-user workflows
- Desktop n8n instances

### Remote CLI Server

Set **CLI Server URL** to connect to a remote CLI server instead. Useful for scaled deployments.

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
  "authMode": "github_token",
  "githubToken": "github_pat_xxxxxxxxxxxx",
  "cliUrl": ""
}
```

### Example 2: Remote Service Account
```json
{
  "authMode": "server_token",
  "cliUrl": "copilot-server:8080"
}
```

### Example 3: OpenAI via Local CLI
```json
{
  "authMode": "byok_openai",
  "openaiApiKey": "sk-xxxxxxxxxxxx",
  "cliUrl": ""
}
```

### Example 4: Azure OpenAI via Remote Server
```json
{
  "authMode": "byok_azure_openai",
  "azureOpenaiApiKey": "xxxxxxxxxxxx",
  "azureOpenaiEndpoint": "https://my-resource.openai.azure.com",
  "cliUrl": "azure-copilot:8080"
}
```

## Node Usage

### Inputs
- **Model**: Select the AI model to use (GPT-5, Claude Sonnet 4.5, GPT-4.1, etc.)
- **Prompt**: The message to send to the selected model

### Outputs
- **success**: Boolean indicating if the request succeeded
- **response**: The model's response text
- **sessionId**: The session ID (useful for debugging or session tracking)
- **error**: Error message if the request failed

### Session Context

The node maintains a single session across all input items in a batch. This means:
- First item: Starts a new conversation
- Subsequent items: Same conversation context (history is preserved)
- Last item: Session is automatically cleaned up

This is useful for multi-turn conversations within a single workflow run.

## Development

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

## Troubleshooting

### "GitHub token is not provided"
- Check that you've selected "GitHub Token (Per-User)" auth mode and provided a token
- Verify the token has `copilot` scope

### "Failed to connect to CLI server"
- Verify the CLI Server URL is correct
- Check network connectivity: `telnet host port`
- Ensure the CLI server is running

### "Anthropic API key is required"
- You've selected "BYOK — Anthropic" but didn't provide an API key
- Get a key from https://console.anthropic.com

### Session or model errors
- Check that the selected model is available for your authentication method
- Review the node execution logs for detailed error messages

## References

- [GitHub Copilot SDK Documentation](https://github.com/github/copilot-sdk)
- [n8n Node Development Guide](https://docs.n8n.io/integrations/creating-nodes/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Azure OpenAI Service Documentation](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/)
- [Anthropic API Documentation](https://docs.anthropic.com)

## License

[MIT](LICENSE.md)
