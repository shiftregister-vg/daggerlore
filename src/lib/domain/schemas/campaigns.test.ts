import { describe, expect, it } from 'vitest';
import { createEmptyCompendiumContentIds } from '@domain/character-compendium';
import { CampaignSchema } from './campaigns';

const baseCampaign = {
	name: 'Test Campaign',
	fear_track: 0,
	countdowns: [],
	homebrew_vault: createEmptyCompendiumContentIds()
};

describe('campaign files', () => {
	it('keeps legacy campaigns without file metadata valid', () => {
		expect(CampaignSchema.parse(baseCampaign).files).toBeUndefined();
	});

	it('validates shared file metadata', () => {
		const file = {
			id: '681146b9-bd36-4a2a-b197-30d6b92054a7',
			name: 'map.png',
			content_type: 'image/png',
			size: 2048,
			uploaded_at: '2026-09-22T00:00:00.000Z'
		};

		expect(CampaignSchema.parse({ ...baseCampaign, files: [file] }).files).toEqual([file]);
	});
});
