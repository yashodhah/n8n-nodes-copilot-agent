import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CopilotAgent implements ICredentialType {
	name = 'copilotAuth';
	displayName = 'GitHub Copilot SDK';
	icon: Icon = 'file:CopilotAgentApi.svg';
	documentationUrl =
		'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens';
	testedBy = 'testCopilotAuth';
	properties: INodeProperties[] = [
		{
			displayName: 'Authentication Mode',
			name: 'authMode',
			type: 'options',
			default: 'pat',
			required: true,
			options: [
				{
					name: 'PAT',
					value: 'pat',
					description: 'Use a local Copilot CLI subprocess with a GitHub Personal Access Token.',
				},
				{
					name: 'Server Authenticated',
					value: 'server_authenticated',
					description:
						'Connect to an already authenticated remote CLI server using only its server URL.',
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
			description:
				'A GitHub Personal Access Token (classic or fine-grained) with Copilot access for the local CLI subprocess. Generate one at https://github.com/settings/tokens',
			displayOptions: {
				show: {
					authMode: ['pat'],
				},
			},
		},
		{
			displayName: 'CLI Server URL',
			name: 'cliUrl',
			type: 'string',
			default: '',
			required: true,
			description:
				'Remote CLI server address (e.g., "localhost:8080"). The remote server must already manage its own authentication. Warning: TCP connection is unauthenticated—must be secured at network level (VPC, private network, or same Docker network). Never expose publicly.',
			displayOptions: {
				show: {
					authMode: ['server_authenticated'],
				},
			},
		},
	];
}
