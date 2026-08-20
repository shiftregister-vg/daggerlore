import { env } from '$env/dynamic/private';
import { App } from 'octokit';
import type { GitHubIntegrationStatus, GitHubLabel } from '$lib/types/feedback';
import { verifyWebhookSignature } from './signature';

export type GitHubIssue = {
	id: string;
	number: number;
	title: string;
	body: string | null;
	html_url: string;
	state: 'open' | 'closed';
	state_reason: 'completed' | 'not_planned' | null;
	updated_at: string;
};

type GitHubConfig = {
	enabled: boolean;
	webhooksEnabled: boolean;
	repository: string;
	owner: string;
	repo: string;
	appId: number | null;
	installationId: number | null;
	privateKey: string | null;
	webhookSecret: string | null;
	error: string | null;
};

type ReadyGitHubConfig = GitHubConfig & {
	appId: number;
	installationId: number;
	privateKey: string;
};

const globalForGitHub = globalThis as typeof globalThis & {
	daggerloreGitHubApp?: App;
	daggerloreGitHubAppKey?: string;
};

function enabled(value: string | undefined) {
	return value === 'true' || value === '1';
}

function positiveInteger(value: string | undefined) {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizePrivateKey(value: string | undefined) {
	if (!value) return null;
	return value.replace(/\\n/g, '\n').trim();
}

export function getGitHubConfig(): GitHubConfig {
	const repository = env.GITHUB_REPOSITORY?.trim() || 'shiftregister-vg/daggerlore';
	const [owner, repo, ...extra] = repository.split('/');
	const appId = positiveInteger(env.GITHUB_APP_ID);
	const installationId = positiveInteger(env.GITHUB_APP_INSTALLATION_ID);
	const privateKey = normalizePrivateKey(env.GITHUB_APP_PRIVATE_KEY);
	let error: string | null = null;

	if (!owner || !repo || extra.length) error = 'GITHUB_REPOSITORY must use owner/repository format';
	else if (enabled(env.GITHUB_FEEDBACK_ENABLED) && !appId)
		error = 'GITHUB_APP_ID is not configured';
	else if (enabled(env.GITHUB_FEEDBACK_ENABLED) && !installationId) {
		error = 'GITHUB_APP_INSTALLATION_ID is not configured';
	} else if (enabled(env.GITHUB_FEEDBACK_ENABLED) && !privateKey) {
		error = 'GITHUB_APP_PRIVATE_KEY is not configured';
	}

	return {
		enabled: enabled(env.GITHUB_FEEDBACK_ENABLED),
		webhooksEnabled: enabled(env.GITHUB_FEEDBACK_WEBHOOKS_ENABLED),
		repository,
		owner: owner || '',
		repo: repo || '',
		appId,
		installationId,
		privateKey,
		webhookSecret: env.GITHUB_WEBHOOK_SECRET?.trim() || null,
		error
	};
}

export function getGitHubIntegrationStatus(): GitHubIntegrationStatus {
	const config = getGitHubConfig();
	const webhookError =
		config.webhooksEnabled && !config.webhookSecret
			? 'GITHUB_WEBHOOK_SECRET is not configured'
			: null;
	return {
		enabled: config.enabled,
		configured: config.enabled && !config.error,
		webhooks_enabled: config.webhooksEnabled && !webhookError,
		repository: config.repository,
		error: config.error ?? webhookError
	};
}

function requireConfig(): ReadyGitHubConfig {
	const config = getGitHubConfig();
	if (!config.enabled) throw new Error('GitHub feedback integration is disabled');
	if (config.error || !config.appId || !config.installationId || !config.privateKey) {
		throw new Error(config.error ?? 'GitHub feedback integration is not configured');
	}
	return config as ReadyGitHubConfig;
}

async function installationClient() {
	const config = requireConfig();
	const appKey = `${config.appId}:${config.privateKey}`;
	let app = globalForGitHub.daggerloreGitHubApp;
	if (!app || globalForGitHub.daggerloreGitHubAppKey !== appKey) {
		app = new App({
			appId: config.appId,
			privateKey: config.privateKey
		});
		globalForGitHub.daggerloreGitHubApp = app;
		globalForGitHub.daggerloreGitHubAppKey = appKey;
	}
	return {
		config,
		octokit: await app.getInstallationOctokit(config.installationId)
	};
}

function issueFromResponse(issue: {
	id: number;
	number: number;
	title: string;
	body?: string | null;
	html_url: string;
	state: string;
	state_reason?: string | null;
	updated_at: string;
}): GitHubIssue {
	return {
		id: String(issue.id),
		number: issue.number,
		title: issue.title,
		body: issue.body ?? null,
		html_url: issue.html_url,
		state: issue.state === 'closed' ? 'closed' : 'open',
		state_reason:
			issue.state_reason === 'not_planned'
				? 'not_planned'
				: issue.state === 'closed'
					? 'completed'
					: null,
		updated_at: issue.updated_at
	};
}

export async function createGitHubIssue(input: { title: string; body: string; labels: string[] }) {
	const { config, octokit } = await installationClient();
	const { data } = await octokit.rest.issues.create({
		owner: config.owner,
		repo: config.repo,
		title: input.title,
		body: input.body,
		labels: input.labels,
		request: { timeout: 10_000 }
	});
	return issueFromResponse(data);
}

export async function getGitHubIssue(issueNumber: number) {
	const { config, octokit } = await installationClient();
	const { data } = await octokit.rest.issues.get({
		owner: config.owner,
		repo: config.repo,
		issue_number: issueNumber,
		request: { timeout: 10_000 }
	});
	if ('pull_request' in data)
		throw new Error('The selected GitHub number belongs to a pull request');
	return issueFromResponse(data);
}

export async function updateGitHubIssueState(
	issueNumber: number,
	state: 'open' | 'closed',
	stateReason: 'completed' | 'not_planned' | null
) {
	const { config, octokit } = await installationClient();
	const { data } = await octokit.rest.issues.update({
		owner: config.owner,
		repo: config.repo,
		issue_number: issueNumber,
		state,
		...(state === 'closed' ? { state_reason: stateReason ?? 'completed' } : {}),
		request: { timeout: 10_000 }
	});
	return issueFromResponse(data);
}

export async function listGitHubLabels(): Promise<GitHubLabel[]> {
	const { config, octokit } = await installationClient();
	const labels = await octokit.paginate(octokit.rest.issues.listLabelsForRepo, {
		owner: config.owner,
		repo: config.repo,
		per_page: 100,
		request: { timeout: 10_000 }
	});
	return labels
		.map((label) => ({
			name: label.name,
			color: label.color,
			description: label.description ?? null
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

export async function listGitHubIssues(): Promise<GitHubIssue[]> {
	const { config, octokit } = await installationClient();
	const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
		owner: config.owner,
		repo: config.repo,
		state: 'all',
		per_page: 100,
		request: { timeout: 10_000 }
	});
	return issues.filter((issue) => !issue.pull_request).map(issueFromResponse);
}

export function verifyGitHubWebhook(payload: string, signature: string | null) {
	const config = getGitHubConfig();
	if (!config.webhooksEnabled) throw new Error('GitHub webhooks are disabled');
	if (!config.webhookSecret) throw new Error('GITHUB_WEBHOOK_SECRET is not configured');
	return verifyWebhookSignature(payload, signature, config.webhookSecret);
}
