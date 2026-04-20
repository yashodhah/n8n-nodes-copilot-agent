import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { CopilotClient, approveAll } from '@github/copilot-sdk';

interface CopilotClientConfig {
	serverUrl?: string;
	githubToken?: string;
	openaiApiKey?: string;
	azureOpenaiApiKey?: string;
	azureOpenaiEndpoint?: string;
	anthropicApiKey?: string;
}

interface CredentialsWithAuth {
	cliUrl?: string;
	authMode?: string;
	githubToken?: string;
	openaiApiKey?: string;
	azureOpenaiApiKey?: string;
	azureOpenaiEndpoint?: string;
	anthropicApiKey?: string;
}

function buildCopilotClientConfig(credentials: CredentialsWithAuth): CopilotClientConfig {
	const config: CopilotClientConfig = {};

	if (credentials.cliUrl) {
		config.serverUrl = credentials.cliUrl;
	}

	const authMode = credentials.authMode || 'github_token';

	switch (authMode) {
		case 'github_token': {
			if (!credentials.githubToken) {
				const error = new Error('GitHub token is required for GitHub Token auth mode');
				error.name = 'NodeOperationError';
				throw error;
			}
			config.githubToken = credentials.githubToken;
			break;
		}
		case 'server_token':
			// No credentials needed - server's environment token is used
			break;
		case 'byok_openai': {
			if (!credentials.openaiApiKey) {
				const error = new Error('OpenAI API key is required for BYOK-OpenAI mode');
				error.name = 'NodeOperationError';
				throw error;
			}
			config.openaiApiKey = credentials.openaiApiKey;
			break;
		}
		case 'byok_azure_openai': {
			if (!credentials.azureOpenaiApiKey) {
				const error = new Error('Azure OpenAI API key is required for BYOK-Azure mode');
				error.name = 'NodeOperationError';
				throw error;
			}
			if (!credentials.azureOpenaiEndpoint) {
				const error = new Error('Azure OpenAI endpoint is required for BYOK-Azure mode');
				error.name = 'NodeOperationError';
				throw error;
			}
			config.azureOpenaiApiKey = credentials.azureOpenaiApiKey;
			config.azureOpenaiEndpoint = credentials.azureOpenaiEndpoint;
			break;
		}
		case 'byok_anthropic': {
			if (!credentials.anthropicApiKey) {
				const error = new Error('Anthropic API key is required for BYOK-Anthropic mode');
				error.name = 'NodeOperationError';
				throw error;
			}
			config.anthropicApiKey = credentials.anthropicApiKey;
			break;
		}
		default: {
			const error = new Error(`Unknown authentication mode: ${authMode}`);
			error.name = 'NodeOperationError';
			throw error;
		}
	}

	return config;
}

// Standalone implementation for model options (called by the node method)
async function getModelOptionsImpl(this: ILoadOptionsFunctions) {
	try {
		const credentials = await this.getCredentials('copilotAgentApi');
		const config = buildCopilotClientConfig(credentials as CredentialsWithAuth);
		const client = new CopilotClient(config);

		try {
			await client.start();

			// Attempt to fetch available models from SDK
			const models = await (client as any).listModels?.();

			if (Array.isArray(models) && models.length > 0) {
				return models.map((model: any) => ({
					name: model.name || model.id,
					value: model.id,
				}));
			}
		} finally {
			await client.stop();
		}
	} catch (error) {
		// Log warning but continue with fallback
		console.warn('Failed to fetch models from SDK, using fallback list:', error);
	}

	// Static fallback list (matches SDK v0.2.2 supported models)
	return [
		{ name: 'GPT-5', value: 'gpt-5' },
		{ name: 'Claude Sonnet 4.5', value: 'claude-sonnet-4.5' },
		{ name: 'GPT-4.1', value: 'gpt-4.1' },
	];
}

export class CopilotAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Copilot Agent',
		name: 'copilotAgent',
		icon: 'file:copilotAgent.svg',
		group: ['transform'],
		version: 1,
		description: 'Copilot agent node using GitHub Copilot SDK',
		defaults: {
			name: 'Copilot Agent',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'copilotAgentApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModelOptions',
				},
				default: 'gpt-5',
				description: 'AI model to use for the session',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				description: 'Message to send to Copilot',
			},
		],
	};

	// Define methods for n8n to use
	methods = {
		loadOptions: {
			async getModelOptions(this: ILoadOptionsFunctions) {
				return await getModelOptionsImpl.call(this);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		let credentials;
		let config: CopilotClientConfig;

		try {
			credentials = await this.getCredentials('copilotAgentApi');
			config = buildCopilotClientConfig(credentials as CredentialsWithAuth);
		} catch (error) {
			const operationError = new NodeOperationError(this.getNode(), `Failed to retrieve credentials: ${(error as Error).message}`);
			throw operationError;
		}

		const model = this.getNodeParameter('model', 0) as string;
		const client = new CopilotClient(config);

		try {
			// Start the client (required by SDK)
			await client.start();

			// Create session with required permission handler (per Copilot SDK skill)
			const session = await client.createSession({
				model: model || 'gpt-5',
				onPermissionRequest: approveAll,
			});

			try {
				// Process all items using the same session (preserves context and history)
				for (let i = 0; i < items.length; i++) {
					const prompt = this.getNodeParameter('prompt', i) as string;

					if (!prompt || prompt.trim().length === 0) {
						returnData.push({
							json: {
								success: false,
								error: 'Prompt cannot be empty',
								node: 'copilotAgent',
							},
							pairedItem: { item: i },
						});
						continue;
					}

					try {
						// Send prompt and wait for response (SDK request/response pattern)
						const result = await session.sendAndWait({ prompt });

						returnData.push({
							json: {
								success: true,
								sessionId: session.sessionId,
								response: result?.data?.content ?? '',
								node: 'copilotAgent',
							},
							pairedItem: { item: i },
						});
					} catch (itemError) {
						returnData.push({
							json: {
								success: false,
								error: `Failed to process item ${i}: ${(itemError as Error).message}`,
								node: 'copilotAgent',
							},
							pairedItem: { item: i },
						});
					}
				}
			} finally {
				// Cleanup session (required by SDK)
				await session.disconnect();
			}
		} finally {
			// Cleanup client (required by SDK)
			await client.stop();
		}

		return [returnData];
	}
}
