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

type CopilotSession = Awaited<ReturnType<CopilotClient['createSession']>>;

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

async function executeWithResumedSession(
	context: IExecuteFunctions,
	client: CopilotClient,
	items: INodeExecutionData[],
	model: string,
	resumeSessionId: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const session: CopilotSession = await (async () => {
		try {
			return await client.resumeSession(resumeSessionId, { onPermissionRequest: approveAll });
		} catch {
			return await client.createSession({ model: model || 'gpt-5', onPermissionRequest: approveAll });
		}
	})();

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

		let session: CopilotSession | undefined;
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
				displayName: 'Resume Session ID',
				name: 'resumeSessionId',
				type: 'string',
				default: '',
				description:
					'Optional session ID from a previous run. When provided, the node attempts to resume that session and reuses it for all items in the batch. If the session is not found or resumption fails, a new session is started automatically.',
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
				const credentials = credential.data as CredentialsWithAuth;
				const isRemote = Boolean(credentials.cliUrl);

				let config: CopilotClientConfig;
				try {
					config = buildCopilotClientConfig(credentials);
				} catch (error) {
					return { status: 'Error', message: (error as Error).message };
				}

				const client = new CopilotClient(config);
				try {
					await client.start();

					const models = await (client as unknown as CopilotClientExtended).listModels?.();
					const modelCount = Array.isArray(models) ? models.length : 0;
					const modelInfo =
						modelCount > 0 ? ` (${modelCount} model${modelCount === 1 ? '' : 's'} available)` : '';

					if (isRemote) {
						return {
							status: 'OK',
							message: `Connected to remote CLI server at ${credentials.cliUrl}${modelInfo}`,
						};
					} else {
						return {
							status: 'OK',
							message: `Local CLI subprocess started successfully${modelInfo}`,
						};
					}
				} catch (error) {
					if (isRemote) {
						return {
							status: 'Error',
							message: `Failed to connect to remote CLI server at ${credentials.cliUrl}: ${(error as Error).message}`,
						};
					} else {
						return {
							status: 'Error',
							message: `Failed to start local CLI subprocess: ${(error as Error).message}`,
						};
					}
				} finally {
					await client.stop();
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let credentials: CredentialsWithAuth;
		let config: CopilotClientConfig;

		try {
			credentials = (await this.getCredentials('copilotAgentApi')) as CredentialsWithAuth;
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to retrieve credentials: ${(error as Error).message}`,
			);
		}

		try {
			config = buildCopilotClientConfig(credentials);
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid credentials configuration: ${(error as Error).message}`,
			);
		}

		const model = this.getNodeParameter('model', 0) as string;
		const resumeSessionId = this.getNodeParameter('resumeSessionId', 0, '') as string;
		const client = new CopilotClient(config);

		try {
			try {
				await client.start();
			} catch (error) {
				if (credentials.cliUrl) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to connect to remote CLI server at ${credentials.cliUrl}: ${(error as Error).message}. When a CLI Server URL is configured, no subprocess fallback is attempted.`,
					);
				}
				throw new NodeOperationError(
					this.getNode(),
					`Failed to start local CLI subprocess: ${(error as Error).message}`,
				);
			}

			const returnData = resumeSessionId
				? await executeWithResumedSession(this, client, items, model, resumeSessionId)
				: await executeIsolatedSession(this, client, items, model);

			return [returnData];
		} finally {
			await client.stop();
		}
	}
}
