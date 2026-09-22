import { CommunityCardSchema, type CommunityCard } from '@domain/schemas/compendium';
import type { Feature } from '@domain/schemas/rules';
import DOMPurify from 'dompurify';

function cloneFormValue<T>(value: T): T {
	if (Array.isArray(value)) return value.map(cloneFormValue) as T;
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, cloneFormValue(entry)])
		) as T;
	}
	return value;
}

export function communityCardToFormData(item: CommunityCard): CommunityCard {
	return cloneFormValue({
		...item,
		options: item.options ?? [],
		tokens_enabled: item.tokens_enabled ?? false
	});
}

function stripRawHtml(value: string): string {
	return DOMPurify.sanitize(value, {
		ALLOWED_TAGS: [],
		ALLOWED_ATTR: [],
		KEEP_CONTENT: true
	});
}

function normalizeFeature(feature: Feature): Feature {
	return {
		...feature,
		title: feature.title.trim(),
		description_html: stripRawHtml(feature.description_html)
	} as Feature;
}

export function communityCardFormDataToItem(formData: CommunityCard): CommunityCard {
	return {
		...formData,
		source_key: 'Homebrew',
		title: formData.title.trim(),
		description_html: stripRawHtml(formData.description_html),
		artist_name: formData.artist_name.trim(),
		field_group: formData.field_group
			? { name: formData.field_group.name.trim(), count: formData.field_group.count }
			: undefined,
		features: formData.features.map(normalizeFeature),
		options: cloneFormValue(formData.options ?? []),
		tokens_enabled: formData.tokens_enabled || undefined
	};
}

export function normalizeCommunityCard(item: CommunityCard): CommunityCard {
	return CommunityCardSchema.parse(communityCardFormDataToItem(item));
}
