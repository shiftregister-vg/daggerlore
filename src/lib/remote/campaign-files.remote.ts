import { command, getRequestEvent } from '$app/server';
import { getCampaignAccess, updateCampaign } from '$lib/server/app/repository';
import { deleteUserContent, putUserContentImage } from '$lib/server/usercontent-storage';
import { z } from 'zod';
import { fail, is_failure, ok, require_auth } from './utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'application/pdf',
	'text/plain',
	'text/markdown'
]);

const uploadSchema = z
	.object({
		campaignId: z.string().uuid(),
		data: z.string(),
		name: z.string().trim().min(1).max(255),
		type: z.string()
	})
	.refine((value) => (value.data.length * 3) / 4 <= MAX_FILE_SIZE, {
		message: 'File size must be 10MB or less'
	})
	.refine((value) => ALLOWED_TYPES.has(value.type), {
		message: 'Only images, PDFs, Markdown, and text files are supported'
	});

const deleteSchema = z.object({
	campaignId: z.string().uuid(),
	fileId: z.string().uuid()
});

export const upload_campaign_file = command(uploadSchema, async (input) => {
	const event = getRequestEvent();
	const auth = await require_auth(event);
	if (is_failure(auth)) return auth;

	const access = await getCampaignAccess(auth.data.userId, input.campaignId);
	if (!access?.isOwner) return fail('forbidden', 'Only the GM can upload campaign files', 403);

	const binary = atob(input.data);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);

	const fileId = crypto.randomUUID();
	try {
		await putUserContentImage(
			event.platform,
			`campaigns/${input.campaignId}/${fileId}`,
			bytes.buffer,
			input.type
		);
	} catch (error) {
		console.error('Failed to upload campaign file', error);
		return fail('dependency_unavailable', 'File storage is not available', 503);
	}

	const file = {
		id: fileId,
		name: input.name,
		content_type: input.type,
		size: bytes.byteLength,
		uploaded_at: new Date().toISOString()
	};
	try {
		await updateCampaign(auth.data.userId, input.campaignId, {
			...access.campaign,
			files: [...(access.campaign.files ?? []), file]
		});
	} catch (error) {
		await deleteUserContent(event.platform, `campaigns/${input.campaignId}/${fileId}`).catch(
			() => {}
		);
		console.error('Failed to save campaign file metadata', error);
		return fail('internal_error', 'Unable to add the file to this campaign', 500);
	}

	return ok(file);
});

export const delete_campaign_file = command(deleteSchema, async (input) => {
	const event = getRequestEvent();
	const auth = await require_auth(event);
	if (is_failure(auth)) return auth;

	const access = await getCampaignAccess(auth.data.userId, input.campaignId);
	if (!access?.isOwner) return fail('forbidden', 'Only the GM can delete campaign files', 403);
	if (!(access.campaign.files ?? []).some((file) => file.id === input.fileId)) {
		return fail('not_found', 'Campaign file not found', 404);
	}

	try {
		await updateCampaign(auth.data.userId, input.campaignId, {
			...access.campaign,
			files: (access.campaign.files ?? []).filter((file) => file.id !== input.fileId)
		});
	} catch (error) {
		console.error('Failed to remove campaign file metadata', error);
		return fail('internal_error', 'Unable to remove the campaign file', 500);
	}
	await deleteUserContent(event.platform, `campaigns/${input.campaignId}/${input.fileId}`).catch(
		(error) => console.error('Failed to delete campaign file object', error)
	);

	return ok(null);
});
