import type { HomebrewErrorPath, HomebrewErrorSummary } from '../helpers';

export function summarizeCommunityCardFormErrors(summary: HomebrewErrorSummary): string[] {
	return summary.fieldErrors.map(
		(error) => `${formatCommunityCardErrorPath(error.path)}: ${error.message}`
	);
}

function formatCommunityCardErrorPath(path: HomebrewErrorPath): string {
	if (path.length === 0) return 'Community card';

	const [section, index] = path;

	if (section === 'options' && typeof index === 'number') {
		return formatCardChoicePath(index, path.slice(2));
	}

	if (section === 'features' && typeof index === 'number') {
		return joinLabels(`Feature ${index + 1}`, formatFieldPath(path.slice(2)));
	}

	if (typeof section === 'string') {
		return joinLabels(fieldLabel(section), formatFieldPath(path.slice(1)));
	}

	return formatFieldPath(path) || 'Community card';
}

function formatCardChoicePath(choiceIndex: number, path: HomebrewErrorPath): string {
	const [section, index] = path;
	const choiceLabel = `Card choice ${choiceIndex + 1}`;

	if (section === 'choice_id') {
		return `${choiceLabel} name`;
	}

	if (section === 'options' && typeof index === 'number') {
		const [selectionField] = path.slice(2);
		if (selectionField === 'selection_id') {
			return `${choiceLabel} selection ${index + 1} name`;
		}
		return joinLabels(`${choiceLabel} selection ${index + 1}`, formatFieldPath(path.slice(2)));
	}

	if (section === 'conditional_choice') {
		return joinLabels(`${choiceLabel} condition`, formatFieldPath(path.slice(1)));
	}

	return joinLabels(choiceLabel, formatFieldPath(path));
}

function formatFieldPath(path: HomebrewErrorPath): string {
	if (path.length === 0) return '';

	const labels: string[] = [];
	for (const segment of path) {
		if (typeof segment === 'number') {
			const previous = labels.pop();
			labels.push(previous ? `${previous} ${segment + 1}` : String(segment + 1));
			continue;
		}
		labels.push(fieldLabel(segment));
	}

	return labels.join(' ');
}

function fieldLabel(field: string): string {
	const labels: Record<string, string> = {
		title: 'Name',
		description_html: 'Description',
		image_url: 'Image',
		field_group: 'Character field group',
		name: 'Name',
		count: 'Field count',
		domain_id: 'Domain',
		level_requirement: 'Level requirement',
		recall_cost: 'Recall cost',
		category: 'Category',
		type: 'Type',
		max: 'Maximum',
		choice_id: 'Choice',
		selection_id: 'Selection',
		short_title: 'Short name',
		conditional_choice: 'Condition',
		character_modifiers: 'Character modifier',
		weapon_modifiers: 'Weapon modifier',
		character_conditions: 'Character condition',
		value: 'Value',
		amount: 'Amount',
		trait: 'Trait',
		options: 'Selection',
		id: 'Item'
	};

	return (
		labels[field] ??
		titleCase(
			field
				.replace(/_id$/, '')
				.replace(/_html$/, '')
				.replace(/_/g, ' ')
		)
	);
}

function joinLabels(...labels: string[]): string {
	return labels.filter(Boolean).join(' ');
}

function titleCase(value: string): string {
	return value.replace(/\b\w/g, (match) => match.toUpperCase());
}
