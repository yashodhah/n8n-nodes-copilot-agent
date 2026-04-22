import { ApplicationError } from 'n8n-workflow';

export interface CopilotClientConfig {
	serverUrl?: string;
	githubToken?: string;
}

export interface CredentialsWithAuth {
	cliUrl?: string;
	authMode?: string;
	githubToken?: string;
}

export interface CopilotModel {
	id: string;
	name?: string;
}

export interface CopilotClientExtended {
	listModels?: () => Promise<CopilotModel[]>;
}

export function buildCopilotClientConfig(credentials: CredentialsWithAuth): CopilotClientConfig {
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
