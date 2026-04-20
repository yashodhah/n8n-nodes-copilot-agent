import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const isCopilotDebugEnabled =
	(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.
		COPILOT_AGENT_DEBUG === '1';

if (isCopilotDebugEnabled) {
	globalThis.console?.error('[copilot-agent][debug] CopilotAgent.credentials.ts loaded');
}

export class CopilotAgent implements ICredentialType {
	name = 'copilotAgentApi';
	displayName = 'GitHub Copilot API';
	documentationUrl = 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens';
	properties: INodeProperties[] = [
		{
			displayName: 'CLI Server URL',
			name: 'cliUrl',
			type: 'string',
			default: '',
			required: false,
			description: 'Optional: Remote CLI server address (e.g., "localhost:8080"). Leave empty to spawn CLI locally. Warning: TCP connection is unauthenticated—must be secured at network level (VPC, private network, or same Docker network). Never expose publicly.',
		},
		{
			displayName: 'Authentication Mode',
			name: 'authMode',
			type: 'options',
			default: 'github_token',
			required: true,
			options: [
				{
					name: 'GitHub Token (Per-User)',
					value: 'github_token',
					description: 'Use a personal GitHub PAT. Token is passed per-request.',
				},
				{
					name: 'Server Token (Shared Service Account)',
					value: 'server_token',
					description: 'Connect to CLI server with its own environment-provided token. No credentials needed.',
				},
				{
					name: 'BYOK — OpenAI',
					value: 'byok_openai',
					description: 'Use your own OpenAI API key instead of GitHub Copilot.',
				},
				{
					name: 'BYOK — Azure OpenAI',
					value: 'byok_azure_openai',
					description: 'Use your own Azure OpenAI service instead of GitHub Copilot.',
				},
				{
					name: 'BYOK — Anthropic',
					value: 'byok_anthropic',
					description: 'Use your own Anthropic API key instead of GitHub Copilot.',
				},
			],
		},
		{
			displayName: 'GitHub Personal Access Token',
			name: 'githubToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'A GitHub Personal Access Token (classic or fine-grained) with Copilot access. Generate one at https://github.com/settings/tokens',
			displayOptions: {
				show: {
					authMode: ['github_token'],
				},
			},
		},
		{
			displayName: 'OpenAI API Key',
			name: 'openaiApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your OpenAI API key. Get one at https://platform.openai.com/account/api-keys',
			displayOptions: {
				show: {
					authMode: ['byok_openai'],
				},
			},
		},
		{
			displayName: 'Azure OpenAI API Key',
			name: 'azureOpenaiApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Azure OpenAI API key',
			displayOptions: {
				show: {
					authMode: ['byok_azure_openai'],
				},
			},
		},
		{
			displayName: 'Azure OpenAI Endpoint',
			name: 'azureOpenaiEndpoint',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Azure OpenAI service endpoint (e.g., "https://my-resource.openai.azure.com")',
			displayOptions: {
				show: {
					authMode: ['byok_azure_openai'],
				},
			},
		},
		{
			displayName: 'Anthropic API Key',
			name: 'anthropicApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Anthropic API key. Get one at https://console.anthropic.com',
			displayOptions: {
				show: {
					authMode: ['byok_anthropic'],
				},
			},
		},
	];
}
