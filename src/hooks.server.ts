import * as Sentry from '@sentry/sveltekit';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { dev } from '$app/environment';
import { handle as authHandle } from './auth';
import { ensureInviteAccessForRequest } from '$lib/server/app/invite-access';
import { getSystemOperationsSettings, isUserAdmin } from '$lib/server/app/repository';

function isMaintenanceAllowedPath(pathname: string) {
	return (
		pathname.startsWith('/maintenance') ||
		pathname.startsWith('/auth') ||
		pathname.startsWith('/api/auth') ||
		pathname.startsWith('/_app') ||
		pathname.startsWith('/images') ||
		pathname === '/favicon.svg' ||
		pathname === '/apple-touch-icon.png'
	);
}

function normalizedEmail(email: string | null | undefined) {
	return email?.trim().toLowerCase() ?? '';
}

function adminEmails() {
	return new Set(
		(env.ADMIN_EMAIL ?? '')
			.split(',')
			.map((email) => normalizedEmail(email))
			.filter(Boolean)
	);
}

const maintenanceModeHandle: Handle = async ({ event, resolve }) => {
	if (building) {
		return resolve(event);
	}

	let dbMaintenanceEnabled = false;
	try {
		dbMaintenanceEnabled = (await getSystemOperationsSettings()).maintenance_enabled;
	} catch (error) {
		if (dev) console.warn('Unable to load system maintenance setting', error);
	}

	const maintenanceEnabled = env.MAINTENANCE_MODE === 'true' || dbMaintenanceEnabled;

	if (maintenanceEnabled && !isMaintenanceAllowedPath(event.url.pathname)) {
		const session = await event.locals.auth();
		const userId = session?.user?.id;
		const userEmail = normalizedEmail(session?.user?.email);

		const adminIds = env.ADMIN_USER_ID?.split(',') ?? [];
		const hasAdminBypass =
			adminIds.includes(userId ?? '') || adminEmails().has(userEmail) || (await isUserAdmin(userId));

		if (!hasAdminBypass) {
			throw redirect(302, '/maintenance');
		}
	}
	return resolve(event);
};

const inviteOnlyHandle: Handle = async ({ event, resolve }) => {
	if (building) {
		return resolve(event);
	}

	const session = await event.locals.auth();
	await ensureInviteAccessForRequest(session?.user?.id, event.url.pathname);
	return resolve(event);
};

const sentryCloudflareHandle = Sentry.initCloudflareSentryHandle({
	dsn: env.SENTRY_DSN || '',
	tracesSampleRate: 1.0,
	enableLogs: true,
	environment: dev ? 'development' : 'production'
});

export const handle = sequence(
	sentryCloudflareHandle,
	Sentry.sentryHandle(),
	authHandle,
	maintenanceModeHandle,
	inviteOnlyHandle
);
export const handleError = Sentry.handleErrorWithSentry();
