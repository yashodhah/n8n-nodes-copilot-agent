import { buildPermissionHandler, type PermissionMode } from '../session';

// Minimal PermissionRequest shape as defined by the SDK
type MockPermissionRequest = {
	kind: 'shell' | 'write' | 'mcp' | 'read' | 'url' | 'custom-tool';
	[key: string]: unknown;
};

const invocation = { sessionId: 'test-session' };

function makeRequest(kind: MockPermissionRequest['kind']): MockPermissionRequest {
	return { kind };
}

describe('buildPermissionHandler', () => {
	describe('approveAll mode', () => {
		it('should approve shell requests', async () => {
			const handler = buildPermissionHandler('approveAll');
			const result = await handler(makeRequest('shell'), invocation);
			expect(result).toEqual({ kind: 'approved' });
		});

		it('should approve read requests', async () => {
			const handler = buildPermissionHandler('approveAll');
			const result = await handler(makeRequest('read'), invocation);
			expect(result).toEqual({ kind: 'approved' });
		});

		it('should approve write requests', async () => {
			const handler = buildPermissionHandler('approveAll');
			const result = await handler(makeRequest('write'), invocation);
			expect(result).toEqual({ kind: 'approved' });
		});
	});

	describe('denyShell mode', () => {
		it('should deny shell requests', async () => {
			const handler = buildPermissionHandler('denyShell');
			const result = await handler(makeRequest('shell'), invocation);
			expect(result).toEqual({ kind: 'denied-interactively-by-user' });
		});

		it('should approve read requests', async () => {
			const handler = buildPermissionHandler('denyShell');
			const result = await handler(makeRequest('read'), invocation);
			expect(result).toEqual({ kind: 'approved' });
		});

		it('should approve write requests', async () => {
			const handler = buildPermissionHandler('denyShell');
			const result = await handler(makeRequest('write'), invocation);
			expect(result).toEqual({ kind: 'approved' });
		});

		it('should approve mcp requests', async () => {
			const handler = buildPermissionHandler('denyShell');
			const result = await handler(makeRequest('mcp'), invocation);
			expect(result).toEqual({ kind: 'approved' });
		});

		it('should approve url requests', async () => {
			const handler = buildPermissionHandler('denyShell');
			const result = await handler(makeRequest('url'), invocation);
			expect(result).toEqual({ kind: 'approved' });
		});
	});

	describe('readOnly mode', () => {
		it('should approve read requests', async () => {
			const handler = buildPermissionHandler('readOnly');
			const result = await handler(makeRequest('read'), invocation);
			expect(result).toEqual({ kind: 'approved' });
		});

		it('should deny shell requests', async () => {
			const handler = buildPermissionHandler('readOnly');
			const result = await handler(makeRequest('shell'), invocation);
			expect(result).toEqual({ kind: 'denied-interactively-by-user' });
		});

		it('should deny write requests', async () => {
			const handler = buildPermissionHandler('readOnly');
			const result = await handler(makeRequest('write'), invocation);
			expect(result).toEqual({ kind: 'denied-interactively-by-user' });
		});

		it('should deny mcp requests', async () => {
			const handler = buildPermissionHandler('readOnly');
			const result = await handler(makeRequest('mcp'), invocation);
			expect(result).toEqual({ kind: 'denied-interactively-by-user' });
		});

		it('should deny url requests', async () => {
			const handler = buildPermissionHandler('readOnly');
			const result = await handler(makeRequest('url'), invocation);
			expect(result).toEqual({ kind: 'denied-interactively-by-user' });
		});

		it('should deny custom-tool requests', async () => {
			const handler = buildPermissionHandler('readOnly');
			const result = await handler(makeRequest('custom-tool'), invocation);
			expect(result).toEqual({ kind: 'denied-interactively-by-user' });
		});
	});

	describe('default mode (approveAll) is the fallback', () => {
		it('buildPermissionHandler with approveAll returns a function (approveAll)', () => {
			const handler = buildPermissionHandler('approveAll');
			expect(typeof handler).toBe('function');
		});

		it('each mode returns a callable handler', () => {
			const modes: PermissionMode[] = ['approveAll', 'denyShell', 'readOnly'];
			for (const mode of modes) {
				expect(typeof buildPermissionHandler(mode)).toBe('function');
			}
		});
	});
});
