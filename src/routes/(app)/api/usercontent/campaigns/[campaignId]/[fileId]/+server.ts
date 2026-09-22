import { error } from '@sveltejs/kit';
import { getCampaignAccess } from '$lib/server/app/repository';
import { getUserContentImage } from '$lib/server/usercontent-storage';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform, locals, request }) => {
	const session = await locals.auth();
	const userId = session?.user?.id;
	if (!userId) throw error(401, 'Unauthorized');

	const access = await getCampaignAccess(userId, params.campaignId);
	if (!access) throw error(403, 'Not a member of this campaign');
	const file = (access.campaign.files ?? []).find((entry) => entry.id === params.fileId);
	if (!file) throw error(404, 'Campaign file not found');

	let object;
	try {
		object = await getUserContentImage(platform, `campaigns/${params.campaignId}/${params.fileId}`);
	} catch (cause) {
		console.error('Failed to fetch campaign file', cause);
		throw error(500, 'Unable to load campaign file');
	}
	if (!object) throw error(404, 'Campaign file not found');

	const headers = new Headers({
		'Cache-Control': 'private, max-age=3600',
		'Content-Type': file.content_type,
		'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
		'X-Content-Type-Options': 'nosniff'
	});
	if (object.etag) headers.set('ETag', object.etag);
	if (object.lastModified) headers.set('Last-Modified', object.lastModified);
	if (object.size !== null) headers.set('Content-Length', String(object.size));
	if (object.etag && request.headers.get('if-none-match') === object.etag) {
		return new Response(null, { status: 304, headers });
	}

	return new Response(object.body, { headers });
};
