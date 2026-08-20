import * as repository from './repository';
import {
	createGitHubIssue,
	getGitHubConfig,
	getGitHubIntegrationStatus,
	getGitHubIssue,
	listGitHubIssues,
	listGitHubLabels,
	updateGitHubIssueState,
	type GitHubIssue
} from '$lib/server/github/client';
import type { Feedback, GitHubIssueDraft, GitHubReconcileResult } from '$lib/types/feedback';
import {
	buildGitHubIssueDraft,
	feedbackIdsFromGitHubBody,
	feedbackStatusToGitHubState
} from '$lib/feedback/github';

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'GitHub request failed';
}

function requireEligibleCategory(feedback: Feedback) {
	if (feedback.category !== 'bug' && feedback.category !== 'feature') {
		throw new Error('Only bug and feature feedback can be associated with GitHub issues');
	}
}

function validateDraft(data: unknown): GitHubIssueDraft {
	const input = (data ?? {}) as Record<string, unknown>;
	const title = typeof input.title === 'string' ? input.title.trim() : '';
	const body = typeof input.body === 'string' ? input.body.trim() : '';
	const labels = Array.isArray(input.labels)
		? [
				...new Set(
					input.labels
						.filter((label): label is string => typeof label === 'string')
						.map((label) => label.trim())
						.filter(Boolean)
				)
			]
		: [];
	if (!title) throw new Error('GitHub issue title is required');
	if (title.length > 256) throw new Error('GitHub issue title must be 256 characters or less');
	if (!body) throw new Error('GitHub issue body is required');
	if (body.length > 65_536) throw new Error('GitHub issue body is too long');
	if (labels.length > 20 || labels.some((label) => label.length > 100)) {
		throw new Error('Invalid GitHub issue labels');
	}
	return { title, body, labels };
}

export async function getAdminGitHubStatus(userId: string | undefined) {
	await repository.getAdminAccess(userId);
	return getGitHubIntegrationStatus();
}

export async function listAdminGitHubLabels(userId: string | undefined) {
	await repository.getAdminAccess(userId);
	return listGitHubLabels();
}

async function createIssueForFeedback(feedback: Feedback, draft: GitHubIssueDraft) {
	const claimed = await repository.claimFeedbackGitHubCreation(feedback.id);
	if (!claimed) throw new Error('Feedback is already linked or issue creation is in progress');
	try {
		const issue = await createGitHubIssue(draft);
		await repository.setFeedbackGitHubIssue(feedback.id, getGitHubConfig().repository, issue);
		return issue;
	} catch (error) {
		await repository.markFeedbackGitHubError(feedback.id, errorMessage(error));
		throw error;
	}
}

export async function tryAutomaticGitHubIssueCreation(
	userId: string | undefined,
	feedbackId: string
) {
	const config = getGitHubConfig();
	if (!config.enabled || config.error || !userId) return;
	const feedback = await repository.getFeedbackForIntegration(feedbackId);
	if (feedback.category !== 'bug' && feedback.category !== 'feature') return;
	try {
		await createIssueForFeedback(feedback, buildGitHubIssueDraft(feedback));
	} catch (error) {
		console.error('Unable to create GitHub issue for feedback', feedbackId, error);
	}
}

export async function createAdminFeedbackGitHubIssue(
	userId: string | undefined,
	feedbackId: string,
	data: unknown
) {
	const feedback = await repository.getAdminFeedback(userId, feedbackId);
	requireEligibleCategory(feedback);
	await createIssueForFeedback(feedback, validateDraft(data));
	return repository.getAdminFeedback(userId, feedbackId);
}

async function synchronizeLinkedStatus(feedback: Feedback) {
	if (!feedback.github_repository || feedback.github_issue_number == null) return;
	const config = getGitHubConfig();
	if (feedback.github_repository !== config.repository) {
		throw new Error(
			`Linked issue belongs to ${feedback.github_repository}, not ${config.repository}`
		);
	}
	const desired = feedbackStatusToGitHubState(feedback.status);
	const issue = await updateGitHubIssueState(
		feedback.github_issue_number,
		desired.state,
		desired.stateReason
	);
	await repository.updateLinkedFeedbackGitHubIssue(
		feedback.github_repository,
		feedback.github_issue_number,
		issue
	);
}

export async function updateAdminFeedback(
	userId: string | undefined,
	feedbackId: string,
	data: unknown
) {
	const before = await repository.getAdminFeedback(userId, feedbackId);
	let updated = await repository.updateAdminFeedback(userId, feedbackId, data);
	if (
		!before.github_repository ||
		before.github_issue_number == null ||
		before.status === updated.status
	) {
		return updated;
	}

	await repository.updateLinkedFeedbackStatus(
		before.github_repository,
		before.github_issue_number,
		updated.status
	);
	updated = await repository.getAdminFeedback(userId, feedbackId);
	try {
		await synchronizeLinkedStatus(updated);
	} catch (error) {
		await repository.markLinkedFeedbackGitHubError(
			before.github_repository,
			before.github_issue_number,
			errorMessage(error)
		);
	}
	return repository.getAdminFeedback(userId, feedbackId);
}

export async function linkAdminFeedbackGitHubIssue(
	userId: string | undefined,
	feedbackId: string,
	data: unknown
) {
	const feedback = await repository.getAdminFeedback(userId, feedbackId);
	requireEligibleCategory(feedback);
	if (feedback.github_issue_number != null)
		throw new Error('Feedback is already linked to a GitHub issue');
	const input = (data ?? {}) as Record<string, unknown>;
	const issueNumber = Number(input.issue_number);
	if (!Number.isInteger(issueNumber) || issueNumber < 1)
		throw new Error('A valid GitHub issue number is required');
	const issue = await getGitHubIssue(issueNumber);
	const githubRepository = getGitHubConfig().repository;
	await repository.setFeedbackGitHubIssue(feedbackId, githubRepository, issue);
	await repository.applyGitHubIssueStateToLinkedFeedback(githubRepository, issue);
	return repository.getAdminFeedback(userId, feedbackId);
}

export async function unlinkAdminFeedbackGitHubIssue(
	userId: string | undefined,
	feedbackId: string
) {
	return repository.clearAdminFeedbackGitHubIssue(userId, feedbackId);
}

export async function refreshAdminFeedbackGitHubIssue(
	userId: string | undefined,
	feedbackId: string
) {
	const feedback = await repository.getAdminFeedback(userId, feedbackId);
	if (!feedback.github_repository || feedback.github_issue_number == null) {
		throw new Error('Feedback is not linked to a GitHub issue');
	}
	if (feedback.github_repository !== getGitHubConfig().repository) {
		throw new Error('The linked issue belongs to a different GitHub repository');
	}
	try {
		const issue = await getGitHubIssue(feedback.github_issue_number);
		await repository.applyGitHubIssueStateToLinkedFeedback(feedback.github_repository, issue);
	} catch (error) {
		await repository.markLinkedFeedbackGitHubError(
			feedback.github_repository,
			feedback.github_issue_number,
			errorMessage(error)
		);
		throw error;
	}
	return repository.getAdminFeedback(userId, feedbackId);
}

export async function retryAdminFeedbackGitHubSync(userId: string | undefined, feedbackId: string) {
	const feedback = await repository.getAdminFeedback(userId, feedbackId);
	requireEligibleCategory(feedback);
	if (feedback.github_issue_number == null) {
		await createIssueForFeedback(feedback, buildGitHubIssueDraft(feedback));
	} else {
		try {
			await synchronizeLinkedStatus(feedback);
		} catch (error) {
			await repository.markLinkedFeedbackGitHubError(
				feedback.github_repository!,
				feedback.github_issue_number,
				errorMessage(error)
			);
			throw error;
		}
	}
	return repository.getAdminFeedback(userId, feedbackId);
}

export async function reconcileAdminFeedbackGitHubIssues(
	userId: string | undefined
): Promise<GitHubReconcileResult> {
	await repository.getAdminAccess(userId);
	const githubRepository = getGitHubConfig().repository;
	const issues = await listGitHubIssues();
	const result: GitHubReconcileResult = {
		scanned: issues.length,
		linked: 0,
		updated: 0,
		conflicts: []
	};

	for (const issue of issues) {
		for (const feedbackId of feedbackIdsFromGitHubBody(issue.body)) {
			try {
				const feedback = await repository.getFeedbackForIntegration(feedbackId);
				if (feedback.category !== 'bug' && feedback.category !== 'feature') {
					result.conflicts.push(
						`${feedbackId} is ${feedback.category} feedback and cannot be linked`
					);
					continue;
				}
				if (
					feedback.github_issue_number != null &&
					(feedback.github_repository !== githubRepository ||
						feedback.github_issue_number !== issue.number)
				) {
					result.conflicts.push(
						`${feedbackId} is already linked to ${feedback.github_repository}#${feedback.github_issue_number}`
					);
					continue;
				}
				if (feedback.github_issue_number == null) {
					await repository.setFeedbackGitHubIssue(feedbackId, githubRepository, issue);
					result.linked += 1;
				} else {
					result.updated += 1;
				}
				await repository.applyGitHubIssueStateToLinkedFeedback(githubRepository, issue);
			} catch (error) {
				if (errorMessage(error) !== 'Feedback not found') {
					result.conflicts.push(`${feedbackId}: ${errorMessage(error)}`);
				}
			}
		}
	}
	await repository.resetStaleFeedbackGitHubCreationClaims();
	return result;
}

export async function applyGitHubWebhookIssue(payload: unknown) {
	const input = (payload ?? {}) as Record<string, unknown>;
	const action = input.action;
	if (action !== 'closed' && action !== 'reopened') return;
	const repositoryPayload = (input.repository ?? {}) as Record<string, unknown>;
	const issuePayload = (input.issue ?? {}) as Record<string, unknown>;
	const repositoryName =
		typeof repositoryPayload.full_name === 'string' ? repositoryPayload.full_name : '';
	const issueNumber = Number(issuePayload.number);
	if (repositoryName !== getGitHubConfig().repository || !Number.isInteger(issueNumber)) return;

	const issue: GitHubIssue = {
		id: String(issuePayload.id ?? ''),
		number: issueNumber,
		title: typeof issuePayload.title === 'string' ? issuePayload.title : '',
		body: typeof issuePayload.body === 'string' ? issuePayload.body : null,
		html_url: typeof issuePayload.html_url === 'string' ? issuePayload.html_url : '',
		state: issuePayload.state === 'closed' ? 'closed' : 'open',
		state_reason:
			issuePayload.state_reason === 'not_planned'
				? 'not_planned'
				: issuePayload.state === 'closed'
					? 'completed'
					: null,
		updated_at:
			typeof issuePayload.updated_at === 'string'
				? issuePayload.updated_at
				: new Date().toISOString()
	};
	await repository.applyGitHubIssueStateToLinkedFeedback(repositoryName, issue, {
		ignoreOlder: true
	});
}
