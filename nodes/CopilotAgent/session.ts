import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { CopilotClient, approveAll } from '@github/copilot-sdk';
import type { PermissionHandler } from '@github/copilot-sdk';

export type PermissionMode = 'approveAll' | 'denyShell' | 'readOnly';

export function buildPermissionHandler(mode: PermissionMode): PermissionHandler {
	if (mode === 'approveAll') return approveAll;
	if (mode === 'denyShell')
		return (req) =>
			req.kind === 'shell'
				? { kind: 'denied-interactively-by-user' }
				: { kind: 'approved' };
	// readOnly
	return (req) =>
		req.kind === 'read' ? { kind: 'approved' } : { kind: 'denied-interactively-by-user' };
}

export async function executeSharedSession(
	context: IExecuteFunctions,
	client: CopilotClient,
	items: INodeExecutionData[],
	model: string,
	permissionMode: PermissionMode = 'approveAll',
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const session = await client.createSession({
		model: model || 'gpt-5',
		onPermissionRequest: buildPermissionHandler(permissionMode),
	});

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

export async function executeIsolatedSession(
	context: IExecuteFunctions,
	client: CopilotClient,
	items: INodeExecutionData[],
	model: string,
	permissionMode: PermissionMode = 'approveAll',
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

		let session;
		try {
			session = await client.createSession({
				model: model || 'gpt-5',
				onPermissionRequest: buildPermissionHandler(permissionMode),
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
