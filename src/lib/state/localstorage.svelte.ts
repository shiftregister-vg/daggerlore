import { browser } from '$app/environment';
import { getContext, setContext } from 'svelte';
import { z } from 'zod';

const APP_PREFERENCES_STORAGE_KEY = 'app_preferences';
const SYNC_DEBOUNCE_MS = 0;

const dashboardPreferencesSchema = z.object({
	leftEnabled: z.boolean(),
	rightEnabled: z.boolean(),
	topEnabled: z.boolean(),
	bottomEnabled: z.boolean(),
	showPreviews: z.boolean()
});

const characterFeatureTabSchema = z.enum([
	'weapons',
	'features',
	'inventory',
	'background',
	'notes',
	'projects',
	'beastform',
	'companion',
	'addons'
]);

const characterBackgroundPreferencesSchema = z.object({
	showPreview: z.boolean(),
	backgroundQuestionsOpen: z.boolean(),
	transformationQuestionsOpen: z.boolean().optional(),
	connectionQuestionsOpen: z.boolean(),
	characterDescriptionOpen: z.boolean()
});

const characterNotesPreferencesSchema = z.object({
	showPreview: z.boolean()
});

const characterCampaignPreferencesSchema = z.object({
	campaignInfoOpen: z.boolean()
});

const encounterNotesPreferencesSchema = z.object({
	showPreview: z.boolean()
});

const encounterAdversaryCardPreferencesSchema = z.object({
	movesOpen: z.boolean(),
	featuresOpen: z.boolean(),
	instanceOpenStates: z.array(z.boolean())
});

const encounterEnvironmentCardPreferencesSchema = z.object({
	detailsOpen: z.boolean(),
	featuresOpen: z.boolean()
});

const encounterCollapsiblePreferencesSchema = z.object({
	adversaryCards: z.record(z.string(), encounterAdversaryCardPreferencesSchema),
	environmentCards: z.record(z.string(), encounterEnvironmentCardPreferencesSchema)
});

const appPreferencesSchema = z.object({
	card_carousel_selected_index: z.record(z.string(), z.number()),
	campaign_gm_dashboard: z.record(z.string(), dashboardPreferencesSchema),
	campaign_player_dashboard: z.record(z.string(), dashboardPreferencesSchema),
	card_carousel_scroll_position: z.record(z.string(), z.number()),
	character_feature_tab: z.record(z.string(), characterFeatureTabSchema),
	character_background_preferences: z.record(z.string(), characterBackgroundPreferencesSchema),
	character_notes_preferences: z.record(z.string(), characterNotesPreferencesSchema),
	character_campaign_preferences: z.record(z.string(), characterCampaignPreferencesSchema),
	encounter_notes_preferences: z.record(z.string(), encounterNotesPreferencesSchema),
	encounter_collapsible_preferences: z.record(z.string(), encounterCollapsiblePreferencesSchema)
});

type AppPreferences = z.infer<typeof appPreferencesSchema>;

function getDefaultAppPreferences(): AppPreferences {
	return {
		card_carousel_selected_index: {},
		card_carousel_scroll_position: {},
		character_background_preferences: {},
		character_campaign_preferences: {},
		character_feature_tab: {},
		character_notes_preferences: {},
		encounter_notes_preferences: {},
		encounter_collapsible_preferences: {},
		campaign_gm_dashboard: {},
		campaign_player_dashboard: {}
	};
}

function readInitialAppPreferences(): AppPreferences {
	if (!browser) return getDefaultAppPreferences();

	const stored = localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
	if (!stored) return getDefaultAppPreferences();

	try {
		const parsed = appPreferencesSchema.partial().safeParse(JSON.parse(stored));
		return parsed.success
			? {
					...getDefaultAppPreferences(),
					...parsed.data
				}
			: getDefaultAppPreferences();
	} catch {
		return getDefaultAppPreferences();
	}
}

function createLocalstorage() {
	const initialAppPreferences = readInitialAppPreferences();
	let app_preferences: AppPreferences = $state(initialAppPreferences);

	const app_preferences_snapshot = $derived(JSON.stringify(app_preferences));

	let lastSavedSnapshot = JSON.stringify(initialAppPreferences);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function clearPendingSync() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
		}
	}

	$effect(() => {
		if (!browser) {
			clearPendingSync();
			return;
		}

		clearPendingSync();

		if (app_preferences_snapshot === lastSavedSnapshot) return;

		const snapshotToSave = app_preferences_snapshot;
		debounceTimer = setTimeout(() => {
			debounceTimer = undefined;
			localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, snapshotToSave);
			lastSavedSnapshot = snapshotToSave;
		}, SYNC_DEBOUNCE_MS);

		return () => {
			clearPendingSync();
		};
	});

	return {
		get app_preferences() {
			return app_preferences;
		}
	};
}

const LOCALSTORAGE_KEY = Symbol('Localstorage');

export const setLocalstorageContext = () => {
	const newLocalstorage = createLocalstorage();
	return setContext(LOCALSTORAGE_KEY, newLocalstorage);
};

export const getLocalstorageContext = (): ReturnType<typeof setLocalstorageContext> => {
	return getContext(LOCALSTORAGE_KEY) as ReturnType<typeof setLocalstorageContext>;
};
