import { describe, expect, it } from 'vitest';
import {
	buildGitHubIssueDraft,
	feedbackIdsFromGitHubBody,
	feedbackStatusToGitHubState,
	githubIssueToFeedbackStatus,
	isGitHubEligibleFeedback
} from './github';

const feedback = {
	id: 'd3b77441-a542-4b74-bc54-2ae87b67de68',
	category: 'bug',
	subject: 'Avatar does not save',
	message: 'Changing the avatar does not persist after reload.',
	page_url: 'https://daggerlore.example/characters/123/edit'
};

describe('GitHub feedback issue formatting', () => {
	it('builds a deterministic privacy-minimal bug issue', () => {
		const draft = buildGitHubIssueDraft(feedback);
		expect(draft.title).toBe(feedback.subject);
		expect(draft.labels).toEqual(['bug']);
		expect(draft.body).toContain(`daggerlore-feedback-id: ${feedback.id}`);
		expect(draft.body).toContain(feedback.message);
		expect(draft.body).toContain(feedback.page_url);
		expect(draft.body).not.toMatch(/reporter|email|user agent/i);
	});

	it('maps feature feedback to the enhancement label', () => {
		expect(buildGitHubIssueDraft({ ...feedback, category: 'feature' }).labels).toEqual([
			'enhancement'
		]);
	});

	it('only considers bug and feature feedback eligible', () => {
		expect(isGitHubEligibleFeedback({ category: 'bug' })).toBe(true);
		expect(isGitHubEligibleFeedback({ category: 'feature' })).toBe(true);
		expect(isGitHubEligibleFeedback({ category: 'account' })).toBe(false);
		expect(isGitHubEligibleFeedback(null)).toBe(false);
	});
});

describe('GitHub feedback status mapping', () => {
	it('maps local states to GitHub state and reason', () => {
		expect(feedbackStatusToGitHubState('new')).toEqual({ state: 'open', stateReason: null });
		expect(feedbackStatusToGitHubState('reviewing')).toEqual({ state: 'open', stateReason: null });
		expect(feedbackStatusToGitHubState('resolved')).toEqual({
			state: 'closed',
			stateReason: 'completed'
		});
		expect(feedbackStatusToGitHubState('archived')).toEqual({
			state: 'closed',
			stateReason: 'not_planned'
		});
	});

	it('maps GitHub state back to feedback', () => {
		expect(githubIssueToFeedbackStatus('open', null)).toBe('reviewing');
		expect(githubIssueToFeedbackStatus('closed', 'completed')).toBe('resolved');
		expect(githubIssueToFeedbackStatus('closed', null)).toBe('resolved');
		expect(githubIssueToFeedbackStatus('closed', 'not_planned')).toBe('archived');
	});
});

describe('GitHub feedback association markers', () => {
	it('finds both legacy and current feedback IDs without duplicates', () => {
		const body = `
Feedback report: d3b77441-a542-4b74-bc54-2ae87b67de68
<!-- daggerlore-feedback-id: D3B77441-A542-4B74-BC54-2AE87B67DE68 -->
Feedback report: b68a59a6-18c2-4dcf-9d3f-b79c822ad88e
`;
		expect(feedbackIdsFromGitHubBody(body)).toEqual([
			'd3b77441-a542-4b74-bc54-2ae87b67de68',
			'b68a59a6-18c2-4dcf-9d3f-b79c822ad88e'
		]);
	});
});
