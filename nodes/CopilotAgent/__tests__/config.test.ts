import { normalizeAuthMode, buildCopilotClientConfig } from '../config';

describe('config', () => {
	describe('normalizeAuthMode', () => {
		it('should return pat for undefined', () => {
			expect(normalizeAuthMode(undefined)).toBe('pat');
		});

		it('should return pat when explicitly passed', () => {
			expect(normalizeAuthMode('pat')).toBe('pat');
		});

		it('should return server_authenticated when passed', () => {
			expect(normalizeAuthMode('server_authenticated')).toBe('server_authenticated');
		});

		it('should throw for unknown auth mode', () => {
			expect(() => normalizeAuthMode('invalid' as any)).toThrow();
		});
	});

	describe('buildCopilotClientConfig', () => {
		it('should build config for PAT mode', () => {
			const credentials = {
				authMode: 'pat' as const,
				githubToken: 'test-token',
			};

			const config = buildCopilotClientConfig(credentials);

			expect(config).toEqual({
				githubToken: 'test-token',
			});
		});

		it('should build config for server authenticated mode', () => {
			const credentials = {
				authMode: 'server_authenticated' as const,
				cliUrl: 'http://localhost:8080',
			};

			const config = buildCopilotClientConfig(credentials);

			expect(config).toEqual({
				cliUrl: 'http://localhost:8080',
			});
		});

		it('should throw when github token missing in PAT mode', () => {
			const credentials = {
				authMode: 'pat' as const,
			};

			expect(() => buildCopilotClientConfig(credentials)).toThrow(
				'GitHub token is required for PAT mode',
			);
		});

		it('should throw when cliUrl missing in server authenticated mode', () => {
			const credentials = {
				authMode: 'server_authenticated' as const,
			};

			expect(() => buildCopilotClientConfig(credentials)).toThrow(
				'CLI Server URL is required for Server Authenticated mode',
			);
		});
	});
});
