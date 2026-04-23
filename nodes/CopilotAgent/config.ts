import { ApplicationError } from 'n8n-workflow';
import type { CopilotClientOptions } from '@github/copilot-sdk';

export type CopilotClientConfig = Pick<CopilotClientOptions, 'cliUrl' | 'githubToken'>;
export type AuthMode = 'pat' | 'server_authenticated';

export interface CredentialsWithAuth {
	cliUrl?: string;
	authMode?: AuthMode | 'github_token' | 'server_token';
	githubToken?: string;
}

export interface CopilotModel {
	id: string;
	name?: string;
}

export interface CopilotClientExtended {
	listModels?: () => Promise<CopilotModel[]>;
}

export function normalizeAuthMode(authMode?: CredentialsWithAuth['authMode']): AuthMode {
	switch (authMode) {
		case undefined:
		case 'pat':
		case 'github_token':
			return 'pat';
		case 'server_authenticated':
		case 'server_token':
			return 'server_authenticated';
		default:
			throw new ApplicationError(`Unknown authentication mode: ${authMode}`);
	}
}

export function buildCopilotClientConfig(credentials: CredentialsWithAuth): CopilotClientConfig {
	const config: CopilotClientConfig = {};
	const authMode = normalizeAuthMode(credentials.authMode);

	switch (authMode) {
		case 'pat': {
			if (!credentials.githubToken) {
				throw new ApplicationError('GitHub token is required for PAT mode');
			}
			config.githubToken = credentials.githubToken;
			break;
		}
		case 'server_authenticated': {
			if (!credentials.cliUrl) {
				throw new ApplicationError('CLI Server URL is required for Server Authenticated mode');
			}
			config.cliUrl = credentials.cliUrl;
			break;
		}
		default: {
			throw new ApplicationError(`Unknown authentication mode: ${authMode}`);
		}
	}

	return config;
}
