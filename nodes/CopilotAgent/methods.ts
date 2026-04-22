import type {
	ICredentialsDecrypted,  
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import { CopilotClient } from '@github/copilot-sdk';
import {
	buildCopilotClientConfig,
	type CopilotClientExtended,
	type CredentialsWithAuth,
} from './config';

export async function getModelOptionsImpl(this: ILoadOptionsFunctions) {
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
		{ name: 'GPT-4.1', value: 'gpt-4.1' },
	];
}

export async function testCopilotApiCredentials(
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as CredentialsWithAuth;
	const isRemote = Boolean(credentials.cliUrl);

	let config;
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
}
