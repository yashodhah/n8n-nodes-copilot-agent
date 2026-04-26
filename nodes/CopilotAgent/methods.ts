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
	normalizeAuthMode,
} from './config';

type ModelOption = { name: string; value: string };

let cachedModels: ModelOption[] | undefined;

export async function getModelOptionsImpl(this: ILoadOptionsFunctions) {
	if (cachedModels) {
		return cachedModels;
	}

	try {
		const credentials = await this.getCredentials('copilotAgentApi');
		const typedCredentials = credentials as CredentialsWithAuth;
		const config = buildCopilotClientConfig(typedCredentials);
		const client = new CopilotClient(config);

		try {
			await client.start();
			const models = await (client as unknown as CopilotClientExtended).listModels?.();

			if (Array.isArray(models) && models.length > 0) {
				const options = models.map((model) => ({
					name: model.name ?? model.id,
					value: model.id,
				}));

				cachedModels = options;
				return options;
			}
		} finally {
			await client.stop();
		}
	} catch {
		this.logger.warn('Failed to fetch models from Copilot SDK, falling back to static model list');
	}

	return [
		{ name: 'GPT-4.1', value: 'gpt-4.1' },
	];
}

export async function testCopilotAuth(
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as CredentialsWithAuth;
	let authMode;

	try {
		authMode = normalizeAuthMode(credentials.authMode);
	} catch (error) {
		return { status: 'Error', message: (error as Error).message };
	}

	const isRemote = authMode === 'server_authenticated';

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
