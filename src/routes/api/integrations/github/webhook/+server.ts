import { text } from '@sveltejs/kit';
import { applyGitHubWebhookIssue } from '$lib/server/app/feedback-github';
import { verifyGitHubWebhook } from '$lib/server/github/client';

export async function POST({ request }) {
	const payload = await request.text();
	const signature = request.headers.get('x-hub-signature-256');
	try {
		if (!verifyGitHubWebhook(payload, signature)) return text('Invalid signature', { status: 401 });
		const event = request.headers.get('x-github-event');
		if (event === 'ping') return new Response(null, { status: 204 });
		if (event !== 'issues') return new Response(null, { status: 204 });
		await applyGitHubWebhookIssue(JSON.parse(payload));
		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('Unable to process GitHub webhook', error);
		return text(error instanceof Error ? error.message : 'Webhook processing failed', {
			status: 400
		});
	}
}
