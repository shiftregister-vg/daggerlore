import type { Feedback, FeedbackStatus, GitHubIssueDraft } from '$lib/types/feedback';

export function buildGitHubIssueDraft(
	feedback: Pick<Feedback, 'id' | 'category' | 'subject' | 'message' | 'page_url'>
): GitHubIssueDraft {
	return {
		title: feedback.subject,
		body: [
			`<!-- daggerlore-feedback-id: ${feedback.id} -->`,
			'',
			'## Feedback report',
			'',
			`- **Feedback ID:** \`${feedback.id}\``,
			`- **Category:** ${feedback.category}`,
			`- **Submitted from:** ${feedback.page_url ?? 'Not provided'}`,
			'',
			'## Report',
			'',
			feedback.message
		].join('\n'),
		labels:
			feedback.category === 'bug' ? ['bug'] : feedback.category === 'feature' ? ['enhancement'] : []
	};
}

export function isGitHubEligibleFeedback(feedback: Pick<Feedback, 'category'> | null) {
	return feedback?.category === 'bug' || feedback?.category === 'feature';
}

export function feedbackStatusToGitHubState(status: FeedbackStatus) {
	if (status === 'resolved') return { state: 'closed' as const, stateReason: 'completed' as const };
	if (status === 'archived')
		return { state: 'closed' as const, stateReason: 'not_planned' as const };
	return { state: 'open' as const, stateReason: null };
}

export function githubIssueToFeedbackStatus(
	state: 'open' | 'closed',
	stateReason: 'completed' | 'not_planned' | null
): FeedbackStatus {
	if (state === 'open') return 'reviewing';
	return stateReason === 'not_planned' ? 'archived' : 'resolved';
}

export function feedbackIdsFromGitHubBody(body: string | null) {
	if (!body) return [];
	const ids = new Set<string>();
	for (const match of body.matchAll(
		/(?:daggerlore-feedback-id:\s*|Feedback report:\s*)([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi
	)) {
		ids.add(match[1].toLowerCase());
	}
	return [...ids];
}
