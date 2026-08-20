export type FeedbackStatus = 'new' | 'reviewing' | 'resolved' | 'archived';

export type GitHubSyncStatus = 'unlinked' | 'creating' | 'synced' | 'error';

export type Feedback = {
	id: string;
	user_id: string | null;
	user_name: string | null;
	user_email: string | null;
	name: string | null;
	email: string | null;
	category: string;
	subject: string;
	message: string;
	page_url: string | null;
	user_agent: string | null;
	status: FeedbackStatus;
	admin_notes: string | null;
	resolved_at: string | number | null;
	github_repository: string | null;
	github_issue_id: string | null;
	github_issue_number: number | null;
	github_issue_url: string | null;
	github_issue_state: 'open' | 'closed' | null;
	github_issue_state_reason: 'completed' | 'not_planned' | null;
	github_issue_updated_at: string | number | null;
	github_sync_status: GitHubSyncStatus;
	github_sync_error: string | null;
	github_synced_at: string | number | null;
	created_at: string | number;
	updated_at: string | number;
};

export type GitHubIssueDraft = {
	title: string;
	body: string;
	labels: string[];
};

export type GitHubLabel = {
	name: string;
	color: string;
	description: string | null;
};

export type GitHubIntegrationStatus = {
	enabled: boolean;
	configured: boolean;
	webhooks_enabled: boolean;
	repository: string;
	error: string | null;
};

export type GitHubReconcileResult = {
	scanned: number;
	linked: number;
	updated: number;
	conflicts: string[];
};
