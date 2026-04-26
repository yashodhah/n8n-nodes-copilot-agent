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
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { CopilotClient } from '@github/copilot-sdk';
import { buildCopilotClientConfig, type CredentialsWithAuth, type CopilotClientConfig } from './config';
import { executeSharedSession, executeIsolatedSession } from './session';
import { getModelOptionsImpl, testCopilotAuth } from './methods';

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
				testedBy: 'credentialTest.testCopilotAuth',
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
				default: 'gpt-4.1',
				description:
					'AI model to use for the session. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 10 },
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
			async testCopilotAuth(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				return testCopilotAuth(credential);
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
		} catch (error) {
			if (this.continueOnFail()) {
				return [items.map((_item, i) => ({
					json: { error: (error as Error).message },
					pairedItem: { item: i },
				}))];
			}
			throw error;
		} finally {
			await client.stop();
		}
	}
}
