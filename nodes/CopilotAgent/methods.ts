import type {
	ICredentialsDecrypted,  
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { CopilotClient } from '@github/copilot-sdk';
import {
	buildCopilotClientConfig,
	type CopilotClientExtended,
	type CredentialsWithAuth,
	normalizeAuthMode,
} from './config';

type ModelOption = { name: string; value: string };

const modelOptionsCache = new Map<string, ModelOption[]>();
const modelOptionsInFlight = new Map<string, Promise<ModelOption[] | undefined>>();

function buildModelOptionsCacheKey(credentials: CredentialsWithAuth): string {
	const authMode = normalizeAuthMode(credentials.authMode);
	const cliUrl = authMode === 'server_authenticated' ? credentials.cliUrl ?? '' : '';
	const tokenSource = authMode === 'pat' ? credentials.githubToken : '';
	const tokenHash = createHash('sha256').update(tokenSource ?? '').digest('hex');

	return `${authMode}:${cliUrl}:${tokenHash}`;
}

export async function getModelOptionsImpl(this: ILoadOptionsFunctions) {
	try {
		const credentials = await this.getCredentials('copilotAgentApi');
		const typedCredentials = credentials as CredentialsWithAuth;
		const cacheKey = buildModelOptionsCacheKey(typedCredentials);
		const cachedOptions = modelOptionsCache.get(cacheKey);

		if (cachedOptions) {
			return cachedOptions;
		}

		const inFlight = modelOptionsInFlight.get(cacheKey);
		if (inFlight) {
			const options = await inFlight;
			if (options) {
				return options;
			}
		}

		const fetchPromise = (async () => {
			const config = buildCopilotClientConfig(credentials as CredentialsWithAuth);
			const client = new CopilotClient(config);

			try {
				await client.start();
				const models = await (client as unknown as CopilotClientExtended).listModels?.();

				if (Array.isArray(models) && models.length > 0) {
					const options = models.map((model) => ({
						name: model.name ?? model.id,
						value: model.id,
					}));

					modelOptionsCache.set(cacheKey, options);

					return options;
				}
			} finally {
				await client.stop();
			}

			return undefined;
		})();

		modelOptionsInFlight.set(cacheKey, fetchPromise);

		try {
			const options = await fetchPromise;
			if (options) {
				return options;
			}
		} finally {
			modelOptionsInFlight.delete(cacheKey);
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
