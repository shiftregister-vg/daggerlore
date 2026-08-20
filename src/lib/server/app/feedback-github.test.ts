import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Feedback } from '$lib/types/feedback';

vi.mock('./repository', () => ({
	getAdminAccess: vi.fn(),
	getAdminFeedback: vi.fn(),
	getFeedbackForIntegration: vi.fn(),
	claimFeedbackGitHubCreation: vi.fn(),
	setFeedbackGitHubIssue: vi.fn(),
	markFeedbackGitHubError: vi.fn(),
	resetStaleFeedbackGitHubCreationClaims: vi.fn(),
	updateAdminFeedback: vi.fn(),
	updateLinkedFeedbackStatus: vi.fn(),
	updateLinkedFeedbackGitHubIssue: vi.fn(),
	markLinkedFeedbackGitHubError: vi.fn(),
	applyGitHubIssueStateToLinkedFeedback: vi.fn(),
	clearAdminFeedbackGitHubIssue: vi.fn()
}));

vi.mock('$lib/server/github/client', () => ({
	getGitHubConfig: vi.fn(() => ({
		enabled: true,
		error: null,
		repository: 'shiftregister-vg/daggerlore'
	})),
	getGitHubIntegrationStatus: vi.fn(),
	createGitHubIssue: vi.fn(),
	getGitHubIssue: vi.fn(),
	listGitHubIssues: vi.fn(),
	listGitHubLabels: vi.fn(),
	updateGitHubIssueState: vi.fn()
}));

import * as repository from './repository';
import * as github from '$lib/server/github/client';
import { tryAutomaticGitHubIssueCreation, updateAdminFeedback } from './feedback-github';

const baseFeedback: Feedback = {
	id: 'd3b77441-a542-4b74-bc54-2ae87b67de68',
	user_id: 'user-1',
	user_name: 'Reporter',
	user_email: 'reporter@example.com',
	name: null,
	email: null,
	category: 'bug',
	subject: 'Avatar does not save',
	message: 'Changing the avatar does not persist after reload.',
	page_url: 'https://daggerlore.example/characters/123/edit',
	user_agent: 'private user agent',
	status: 'new',
	admin_notes: null,
	resolved_at: null,
	github_repository: null,
	github_issue_id: null,
	github_issue_number: null,
	github_issue_url: null,
	github_issue_state: null,
	github_issue_state_reason: null,
	github_issue_updated_at: null,
	github_sync_status: 'unlinked',
	github_sync_error: null,
	github_synced_at: null,
	created_at: '2026-08-20T00:00:00.000Z',
	updated_at: '2026-08-20T00:00:00.000Z'
};

const githubIssue = {
	id: '1234',
	number: 44,
	title: baseFeedback.subject,
	body: baseFeedback.message,
	html_url: 'https://github.com/shiftregister-vg/daggerlore/issues/44',
	state: 'open' as const,
	state_reason: null,
	updated_at: '2026-08-20T00:01:00.000Z'
};

describe('feedback GitHub orchestration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not auto-create issues for anonymous feedback', async () => {
		await tryAutomaticGitHubIssueCreation(undefined, baseFeedback.id);
		expect(repository.getFeedbackForIntegration).not.toHaveBeenCalled();
		expect(github.createGitHubIssue).not.toHaveBeenCalled();
	});

	it('creates and links an issue for authenticated bug feedback', async () => {
		vi.mocked(repository.getFeedbackForIntegration).mockResolvedValue(baseFeedback);
		vi.mocked(repository.claimFeedbackGitHubCreation).mockResolvedValue(true);
		vi.mocked(github.createGitHubIssue).mockResolvedValue(githubIssue);

		await tryAutomaticGitHubIssueCreation('user-1', baseFeedback.id);

		expect(github.createGitHubIssue).toHaveBeenCalledWith(
			expect.objectContaining({ title: baseFeedback.subject, labels: ['bug'] })
		);
		expect(repository.setFeedbackGitHubIssue).toHaveBeenCalledWith(
			baseFeedback.id,
			'shiftregister-vg/daggerlore',
			githubIssue
		);
	});

	it('keeps feedback and records the error when automatic creation fails', async () => {
		vi.mocked(repository.getFeedbackForIntegration).mockResolvedValue(baseFeedback);
		vi.mocked(repository.claimFeedbackGitHubCreation).mockResolvedValue(true);
		vi.mocked(github.createGitHubIssue).mockRejectedValue(new Error('GitHub unavailable'));
		vi.spyOn(console, 'error').mockImplementation(() => undefined);

		await expect(
			tryAutomaticGitHubIssueCreation('user-1', baseFeedback.id)
		).resolves.toBeUndefined();
		expect(repository.markFeedbackGitHubError).toHaveBeenCalledWith(
			baseFeedback.id,
			'GitHub unavailable'
		);
	});

	it('updates every linked feedback item before synchronizing GitHub status', async () => {
		const linked = {
			...baseFeedback,
			github_repository: 'shiftregister-vg/daggerlore',
			github_issue_number: 44,
			github_issue_id: githubIssue.id,
			github_issue_url: githubIssue.html_url,
			github_issue_state: 'open' as const,
			github_sync_status: 'synced' as const
		};
		const resolved = { ...linked, status: 'resolved' as const };
		vi.mocked(repository.getAdminFeedback)
			.mockResolvedValueOnce(linked)
			.mockResolvedValueOnce(resolved)
			.mockResolvedValueOnce(resolved);
		vi.mocked(repository.updateAdminFeedback).mockResolvedValue(resolved);
		vi.mocked(github.updateGitHubIssueState).mockResolvedValue({
			...githubIssue,
			state: 'closed',
			state_reason: 'completed'
		});

		await updateAdminFeedback('admin-1', linked.id, { status: 'resolved', admin_notes: '' });

		expect(repository.updateLinkedFeedbackStatus).toHaveBeenCalledWith(
			'shiftregister-vg/daggerlore',
			44,
			'resolved'
		);
		expect(github.updateGitHubIssueState).toHaveBeenCalledWith(44, 'closed', 'completed');
		expect(repository.updateLinkedFeedbackGitHubIssue).toHaveBeenCalled();
	});
});
