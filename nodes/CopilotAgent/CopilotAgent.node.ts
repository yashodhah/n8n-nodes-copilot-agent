import type {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { CopilotClient, approveAll } from '@github/copilot-sdk';

interface CopilotClientConfig {
	serverUrl?: string;
	githubToken?: string;
}

interface CredentialsWithAuth {
	cliUrl?: string;
	authMode?: string;
	githubToken?: string;
}

interface CopilotModel {
	id: string;
	name?: string;
}

interface CopilotClientExtended {
	listModels?: () => Promise<CopilotModel[]>;
}

function buildCopilotClientConfig(credentials: CredentialsWithAuth): CopilotClientConfig {
	const config: CopilotClientConfig = {};

	if (credentials.cliUrl) {
		config.serverUrl = credentials.cliUrl;
	}

	const authMode = credentials.authMode ?? 'github_token';

	switch (authMode) {
		case 'github_token': {
			if (!credentials.githubToken) {
				throw new ApplicationError('GitHub token is required for GitHub Token auth mode');
			}
			config.githubToken = credentials.githubToken;
			break;
		}
		case 'server_token':
			break;
		default: {
			throw new ApplicationError(`Unknown authentication mode: ${authMode}`);
		}
	}

	return config;
}

async function getModelOptionsImpl(this: ILoadOptionsFunctions) {
	try {
		const credentials = await this.getCredentials('copilotAgentApi');
		const config = buildCopilotClientConfig(credentials as CredentialsWithAuth);
		const client = new CopilotClient(config);

		try {
			await client.start();
			const models = await (client as unknown as CopilotClientExtended).listModels?.();

			if (Array.isArray(models) && models.length > 0) {
				return models.map((model) => ({
					name: model.name ?? model.id,
					value: model.id,
				}));
			}
		} finally {
			await client.stop();
		}
	} catch {
		// Fall through to static list when SDK is unavailable during credential setup
	}

	return [
		{ name: 'GPT-5', value: 'gpt-5' },
		{ name: 'Claude Sonnet 4.5', value: 'claude-sonnet-4.5' },
		{ name: 'GPT-4.1', value: 'gpt-4.1' },
	];
}

async function executeSharedSession(
	context: IExecuteFunctions,
	client: CopilotClient,
	items: INodeExecutionData[],
	model: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const session = await client.createSession({
		model: model || 'gpt-5',
		onPermissionRequest: approveAll,
	});

	try {
		for (let i = 0; i < items.length; i++) {
			const prompt = context.getNodeParameter('prompt', i) as string;

			if (!prompt || prompt.trim().length === 0) {
				returnData.push({
					json: { success: false, error: 'Prompt cannot be empty', node: 'copilotAgent' },
					pairedItem: { item: i },
				});
				continue;
			}

			try {
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
		await session.disconnect();
	}

	return returnData;
}

async function executeIsolatedSession(
	context: IExecuteFunctions,
	client: CopilotClient,
	items: INodeExecutionData[],
	model: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const prompt = context.getNodeParameter('prompt', i) as string;

		if (!prompt || prompt.trim().length === 0) {
			returnData.push({
				json: { success: false, error: 'Prompt cannot be empty', node: 'copilotAgent' },
				pairedItem: { item: i },
			});
			continue;
		}

		let session;
		try {
			session = await client.createSession({
				model: model || 'gpt-5',
				onPermissionRequest: approveAll,
			});

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
		} finally {
			if (session) {
				await session.disconnect();
			}
		}
	}

	return returnData;
}

export class CopilotAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Copilot Agent',
		name: 'copilotAgent',
		icon: 'file:CopilotAgent.svg',
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
				testedBy: 'testCopilotApiCredentials',
			},
		],
		properties: [
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModelOptions',
				},
				default: 'gpt-5',
				description:
					'AI model to use for the session. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
			{
				displayName: 'Share Session Across Items',
				name: 'shareSession',
				type: 'boolean',
				default: false,
				description:
					'Whether to share a single session across all items. When disabled (default), each item gets its own isolated session for predictable, independent results. When enabled, all items share one session and context carries forward across the batch.',
			},
		],
		usableAsTool: true,
	};

	methods = {
		loadOptions: {
			async getModelOptions(this: ILoadOptionsFunctions) {
				return await getModelOptionsImpl.call(this);
			},
		},
		credentialTest: {
			async testCopilotApiCredentials(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					buildCopilotClientConfig(credential.data as CredentialsWithAuth);
					return { status: 'OK', message: 'Credential configuration is valid' };
				} catch (error) {
					return { status: 'Error', message: (error as Error).message };
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let credentials;
		let config: CopilotClientConfig;

		try {
			credentials = await this.getCredentials('copilotAgentApi');
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to retrieve credentials: ${(error as Error).message}`,
			);
		}

		try {
			config = buildCopilotClientConfig(credentials as CredentialsWithAuth);
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid credentials configuration: ${(error as Error).message}`,
			);
		}

		const model = this.getNodeParameter('model', 0) as string;
		const shareSession = this.getNodeParameter('shareSession', 0, false) as boolean;
		const client = new CopilotClient(config);

		try {
			await client.start();

			const returnData = shareSession
				? await executeSharedSession(this, client, items, model)
				: await executeIsolatedSession(this, client, items, model);

			return [returnData];
		} finally {
			await client.stop();
		}
	}
}
