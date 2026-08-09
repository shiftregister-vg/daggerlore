import {
	PDFButton,
	PDFCheckBox,
	PDFDocument,
	PDFTextField,
	degrees,
	drawCheckMark,
	drawEllipse,
	drawRectangle,
	drawSvgPath,
	rgb,
	type PDFImage
} from 'pdf-lib';
import type { Character } from '@domain/schemas/characters';
import type {
	Armor,
	Beastform,
	CharacterClass,
	DomainCard,
	PrimaryWeapon,
	SecondaryWeapon,
	Subclass
} from '@domain/schemas/compendium';
import type { Feature } from '@domain/schemas/rules';
import type { DerivedCharacterData } from '$lib/state/derive_character';

const BLANK_CHARACTER_SHEET_URL = '/pdfs/blank-character-sheet.pdf';

const TRAITS = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'] as const;
const DOMAIN_CARD_ROWS = 5;
const DOMAIN_CARD_VAULT_COLUMNS = [1, 2] as const;
const PLACEHOLDER_IMAGE_PATHS = new Set([
	'',
	'/images/art/companion-placeholder.webp',
	'/images/art/placeholder-art.webp',
	'/images/art/portrait-placeholder.webp'
]);

type ExportInput = {
	character: Character;
	derived: DerivedCharacterData;
};

type FillableWeapon = PrimaryWeapon | SecondaryWeapon;
type FillableDomainCard = DomainCard & { id: string };
type InventoryWeaponSlot = {
	weapon: FillableWeapon;
	kind: 'primary' | 'secondary';
};
type CheckBoxAppearanceProvider = NonNullable<Parameters<PDFCheckBox['updateAppearances']>[0]>;

function sanitizeFileName(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function sanitizePdfText(value: string): string {
	return value
		.replace(/\u2212/g, '-')
		.replace(/[\u2010-\u2015]/g, '-')
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/\u2022/g, '*')
		.replace(/\u00A0/g, ' ');
}

function formatSigned(value: number | undefined): string {
	if (value === undefined) return '';
	return value > 0 ? `+${value}` : String(value);
}

function capitalize(value: string | undefined): string {
	if (!value) return '';
	return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function stripHtml(value: string | undefined): string {
	return (value ?? '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function featureText(feature: Feature | undefined): string {
	if (!feature) return '';
	const description = stripHtml(feature.description_html);
	return [feature.title, description].filter(Boolean).join(': ');
}

function featuresText(features: Feature[] | undefined): string {
	return (features ?? []).map(featureText).filter(Boolean).join('\n\n');
}

type SubclassCardSlot = {
	subclass: Subclass;
	characterClass: CharacterClass | undefined;
	cardType: 'foundation' | 'specialization' | 'mastery';
	features: Feature[];
};

function formatWeaponTrait(weapon: FillableWeapon | undefined): string {
	if (!weapon) return '';
	const traits = weapon.available_traits.map(capitalize).join('/');
	return [traits, capitalize(weapon.range)].filter(Boolean).join(' - ');
}

function formatWeaponDamage(weapon: FillableWeapon | undefined): string {
	if (!weapon) return '';
	const damageType = weapon.available_damage_types[0]?.toLowerCase() ?? '';
	const damageBonus = weapon.damage_bonus ? formatSigned(weapon.damage_bonus) : '';
	return [weapon.damage_dice + damageBonus, damageType].filter(Boolean).join(' ');
}

function formatWeaponFeature(weapon: FillableWeapon | undefined): string {
	return featuresText(weapon?.features);
}

function formatCardType(card: DomainCard): string {
	return capitalize(card.category);
}

function formatCardName(card: DomainCard): string {
	return card.level_requirement ? `${card.title} (${card.level_requirement})` : card.title;
}

function normalizeLocalUrl(value: string | undefined): string {
	if (!value) return '';
	if (/^(https?:|data:|blob:)/.test(value)) return value;
	if (value.startsWith('/')) return value;
	return `/${value}`;
}

async function fetchWhiteSvgPngBytes(svgUrl: string): Promise<Uint8Array | undefined> {
	if (!svgUrl.endsWith('.svg')) return undefined;

	const response = await fetch(svgUrl);
	if (!response.ok) return undefined;

	const svgText = await response.text();
	const whiteSvg = svgText
		.replace(/currentColor/g, '#ffffff')
		.replace(/fill="(?!none)[^"]*"/g, 'fill="#ffffff"')
		.replace(/stroke="(?!none)[^"]*"/g, 'stroke="#ffffff"');

	const blob = new Blob([whiteSvg], { type: 'image/svg+xml' });
	const objectUrl = URL.createObjectURL(blob);

	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const nextImage = new Image();
			nextImage.onload = () => resolve(nextImage);
			nextImage.onerror = () => reject(new Error(`Unable to rasterize SVG: ${svgUrl}`));
			nextImage.src = objectUrl;
		});

		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const context = canvas.getContext('2d');
		if (!context) return undefined;
		if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return undefined;

		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(image, 0, 0, canvas.width, canvas.height);

		const pngBlob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/png')
		);
		if (!pngBlob) return undefined;

		return new Uint8Array(await pngBlob.arrayBuffer());
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

function isPlaceholderImageUrl(value: string | undefined): boolean {
	if (!value) return true;

	try {
		const url = new URL(value, window.location.origin);
		return PLACEHOLDER_IMAGE_PATHS.has(url.pathname);
	} catch {
		return PLACEHOLDER_IMAGE_PATHS.has(value);
	}
}

async function fetchImagePngBytes(imageUrl: string | undefined): Promise<Uint8Array | undefined> {
	if (isPlaceholderImageUrl(imageUrl)) return undefined;

	const normalizedUrl = normalizeLocalUrl(imageUrl);
	const response = await fetch(normalizedUrl);
	if (!response.ok) return undefined;

	const imageBlob = await response.blob();
	const objectUrl = URL.createObjectURL(imageBlob);

	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const nextImage = new Image();
			nextImage.onload = () => resolve(nextImage);
			nextImage.onerror = () => reject(new Error(`Unable to load image: ${normalizedUrl}`));
			nextImage.src = objectUrl;
		});

		const canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = 512;
		const context = canvas.getContext('2d');
		if (!context) return undefined;

		context.clearRect(0, 0, canvas.width, canvas.height);
		const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
		const width = image.naturalWidth * scale;
		const height = image.naturalHeight * scale;
		const x = (canvas.width - width) / 2;
		const y = (canvas.height - height) / 2;
		context.drawImage(image, x, y, width, height);

		const pngBlob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/png')
		);
		if (!pngBlob) return undefined;

		return new Uint8Array(await pngBlob.arrayBuffer());
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

function setText(form: ReturnType<PDFDocument['getForm']>, name: string, value: unknown): void {
	const field = form.getFieldMaybe(name);
	if (!(field instanceof PDFTextField)) return;

	field.setText(value === undefined || value === null ? '' : sanitizePdfText(String(value)));
}

function setCheck(form: ReturnType<PDFDocument['getForm']>, name: string, checked: boolean): void {
	const field = form.getFieldMaybe(name);
	if (!(field instanceof PDFCheckBox)) return;

	if (checked) {
		field.check();
	} else {
		field.uncheck();
	}
}

function setButtonImage(
	form: ReturnType<PDFDocument['getForm']>,
	name: string,
	image: PDFImage | undefined
): void {
	if (!image) return;

	const field = form.getFieldMaybe(name);
	if (!(field instanceof PDFButton)) return;

	field.setImage(image);
}

function checkboxRectangleAppearance(insetX = 1.25, insetY = 2): CheckBoxAppearanceProvider {
	return (_field, widget) => {
		const { width, height } = widget.getRectangle();
		const mark = drawRectangle({
			x: insetX,
			y: insetY,
			width: Math.max(0, width - insetX * 2),
			height: Math.max(0, height - insetY * 2),
			borderWidth: 0,
			color: rgb(0, 0, 0),
			borderColor: undefined,
			rotate: degrees(0),
			xSkew: degrees(0),
			ySkew: degrees(0)
		});

		return {
			normal: { on: mark, off: [] },
			down: { on: mark, off: [] }
		};
	};
}

function checkboxCircleAppearance(scale = 0.7): CheckBoxAppearanceProvider {
	return (_field, widget) => {
		const { width, height } = widget.getRectangle();
		const radius = (Math.min(width, height) * scale) / 2;
		const mark = drawEllipse({
			x: width / 2,
			y: height / 2,
			xScale: radius,
			yScale: radius,
			borderWidth: 0,
			color: rgb(0, 0, 0),
			borderColor: undefined,
			rotate: degrees(0)
		});

		return {
			normal: { on: mark, off: [] },
			down: { on: mark, off: [] }
		};
	};
}

function checkboxDiamondAppearance(scale = 0.78, dx = 0, dy = 0): CheckBoxAppearanceProvider {
	return (_field, widget) => {
		const { width, height } = widget.getRectangle();
		const size = Math.min(width, height) * scale;
		const x = (width - size) / 2 + dx;
		const y = (height + size) / 2 + dy;
		const mark = drawSvgPath('M 0 0.5 L 0.5 1 L 1 0.5 L 0.5 0 Z', {
			x,
			y,
			scale: size,
			color: rgb(0, 0, 0),
			borderColor: undefined,
			borderWidth: 0,
			rotate: degrees(0)
		});

		return {
			normal: { on: mark, off: [] },
			down: { on: mark, off: [] }
		};
	};
}

function checkboxCheckMarkAppearance(scale = 0.62, dx = 0, dy = 0): CheckBoxAppearanceProvider {
	return (_field, widget) => {
		const { width, height } = widget.getRectangle();
		const size = Math.min(width, height) * scale;
		const mark = drawCheckMark({
			x: width / 2 + dx,
			y: height / 2 - size * 0.03 + dy,
			size,
			thickness: Math.max(1, size * 0.14),
			color: rgb(0, 0, 0)
		});

		return {
			normal: { on: mark, off: [] },
			down: { on: mark, off: [] }
		};
	};
}

function checkboxAppearanceForName(name: string): CheckBoxAppearanceProvider {
	if (/^(hp|stress)\.\d+$/.test(name)) return checkboxRectangleAppearance(1.2, 2.25);
	if (/^companion_stress_\d+$/.test(name)) return checkboxRectangleAppearance(0.9, 1.4);

	if (/^hope\.\d+$/.test(name)) return checkboxDiamondAppearance(0.8);
	if (name === 'companion_training_light_hope') return checkboxDiamondAppearance(0.72);
	if (/^subclass_(foundation|specialization|mastery)_\d+$/.test(name)) {
		return checkboxDiamondAppearance(0.66, 0, -0.15);
	}

	if (/^proficiency\.\d+$/.test(name) || /^companion_attack_d(6|8|10|12)$/.test(name)) {
		return checkboxCircleAppearance(0.72);
	}

	if (/^inventory_\d+_hand_[12]$/.test(name) || /^active_hand_[12]$/.test(name)) {
		return checkboxCircleAppearance(0.58);
	}

	if (/^armor_slot\.\d+\.\d+$/.test(name)) return checkboxCheckMarkAppearance(0.52);

	if (/^domain_card_archived\.\d+\.\d+$/.test(name)) {
		return checkboxCheckMarkAppearance(0.48, -0.2, -0.1);
	}

	return checkboxCheckMarkAppearance();
}

function applyCheckboxAppearances(form: ReturnType<PDFDocument['getForm']>): void {
	for (const field of form.getFields()) {
		if (!(field instanceof PDFCheckBox)) continue;

		field.updateAppearances(checkboxAppearanceForName(field.getName()));
	}
}

function fillCountedChecks(
	form: ReturnType<PDFDocument['getForm']>,
	prefix: string,
	count: number,
	max: number,
	startAt = 0
): void {
	for (let i = 0; i < max; i += 1) {
		setCheck(form, `${prefix}.${i + startAt}`, i < count);
	}
}

function fillUnderscoreCountedChecks(
	form: ReturnType<PDFDocument['getForm']>,
	prefix: string,
	count: number,
	max: number
): void {
	for (let i = 0; i < max; i += 1) {
		setCheck(form, `${prefix}_${i}`, i < count);
	}
}

function fillGold(form: ReturnType<PDFDocument['getForm']>, goldCoins: number): void {
	const handfuls = goldCoins % 10;
	const bags = Math.floor(goldCoins / 10) % 10;
	const hasChest = goldCoins >= 100;

	fillCountedChecks(form, 'gold_handful', handfuls, 9);
	fillCountedChecks(form, 'gold_bag', bags, 9);
	setCheck(form, 'gold_chest', hasChest);
}

function clearDomainCardSlots(form: ReturnType<PDFDocument['getForm']>): void {
	for (let row = 0; row < DOMAIN_CARD_ROWS; row += 1) {
		for (let column = 0; column < 3; column += 1) {
			fillDomainCardSlot(form, row, column, undefined, false);
		}
	}
}

function fillDomainCardSlot(
	form: ReturnType<PDFDocument['getForm']>,
	row: number,
	column: number,
	card: FillableDomainCard | undefined,
	inLoadout: boolean
): void {
	setText(form, `domain_card_name.${row}.${column}`, card ? formatCardName(card) : '');
	setText(form, `domain_card_domain.${row}.${column}`, capitalize(card?.domain_id));
	setText(form, `domain_card_type.${row}.${column}`, card ? formatCardType(card) : '');
	setText(form, `domain_card_recall.${row}.${column}`, card?.recall_cost ?? '');
	setText(form, `domain_card_feature.${row}.${column}`, featuresText(card?.features));
	setCheck(form, `domain_card_archived.${row}.${column}`, inLoadout && Boolean(card));
}

function fillDomainCards(
	form: ReturnType<PDFDocument['getForm']>,
	loadoutCards: FillableDomainCard[],
	vaultCards: FillableDomainCard[]
): void {
	clearDomainCardSlots(form);

	for (let row = 0; row < DOMAIN_CARD_ROWS; row += 1) {
		fillDomainCardSlot(form, row, 0, loadoutCards[row], true);
	}

	for (let index = 0; index < DOMAIN_CARD_ROWS * DOMAIN_CARD_VAULT_COLUMNS.length; index += 1) {
		const row = Math.floor(index / DOMAIN_CARD_VAULT_COLUMNS.length);
		const column = DOMAIN_CARD_VAULT_COLUMNS[index % DOMAIN_CARD_VAULT_COLUMNS.length];
		fillDomainCardSlot(form, row, column, vaultCards[index], false);
	}
}

function fillInventoryWeapons(
	form: ReturnType<PDFDocument['getForm']>,
	character: Character,
	derived: DerivedCharacterData
): void {
	const inventoryWeapons: InventoryWeaponSlot[] = [
		...derived.inventory_primary_weapons
			.filter((weapon) => weapon.inventory_id !== derived.derived_primary_weapon?.inventory_id)
			.map((weapon) => ({ weapon, kind: 'primary' as const })),
		...derived.inventory_secondary_weapons
			.filter((weapon) => weapon.inventory_id !== derived.derived_secondary_weapon?.inventory_id)
			.map((weapon) => ({ weapon, kind: 'secondary' as const }))
	].slice(0, 2);

	for (let i = 0; i < 2; i += 1) {
		const inventoryWeapon = inventoryWeapons[i];
		const weapon = inventoryWeapon?.weapon;
		setText(form, `inventory_weapon_name.${i}`, weapon?.title ?? '');
		setText(form, `inventory_weapon_trait.${i}`, formatWeaponTrait(weapon));
		setText(form, `inventory_weapon_damage.${i}`, formatWeaponDamage(weapon));
		setText(form, `inventory_weapon_feature.${i}`, formatWeaponFeature(weapon));

		setCheck(form, `inventory_${i + 1}_hand_1`, Boolean(weapon && weapon.burden >= 1));
		setCheck(form, `inventory_${i + 1}_hand_2`, Boolean(weapon && weapon.burden >= 2));
		setCheck(form, `inventory_${i + 1}_primary`, inventoryWeapon?.kind === 'primary');
		setCheck(form, `inventory_${i + 1}_secondary`, inventoryWeapon?.kind === 'secondary');
	}
}

function clearSubclassSlot(form: ReturnType<PDFDocument['getForm']>, index: number): void {
	setText(form, `subclass_name_${index}`, '');
	setText(form, `subclass_class_${index}`, '');
	setText(form, `subclass_trait_${index}`, '');
	setText(form, `subclass_feature_${index}`, '');
	setCheck(form, `subclass_foundation_${index}`, false);
	setCheck(form, `subclass_specialization_${index}`, false);
	setCheck(form, `subclass_mastery_${index}`, false);
}

function fillSubclassSlot(
	form: ReturnType<PDFDocument['getForm']>,
	index: number,
	slot: SubclassCardSlot | undefined
): void {
	if (!slot) {
		clearSubclassSlot(form, index);
		return;
	}

	setText(form, `subclass_name_${index}`, slot.subclass.title);
	setText(form, `subclass_class_${index}`, slot.characterClass?.title ?? '');
	setText(
		form,
		`subclass_trait_${index}`,
		capitalize(slot.subclass.spellcast_trait ?? slot.characterClass?.spellcast_trait)
	);
	setText(form, `subclass_feature_${index}`, featuresText(slot.features));
	setCheck(form, `subclass_foundation_${index}`, slot.cardType === 'foundation');
	setCheck(form, `subclass_specialization_${index}`, slot.cardType === 'specialization');
	setCheck(form, `subclass_mastery_${index}`, slot.cardType === 'mastery');
}

function getUnlockedSubclassCardSlots(derived: DerivedCharacterData): SubclassCardSlot[] {
	const slots: SubclassCardSlot[] = [];

	if (derived.primary_subclass) {
		slots.push({
			subclass: derived.primary_subclass,
			characterClass: derived.primary_class,
			cardType: 'foundation',
			features: derived.primary_subclass.foundation_card.features
		});
		if (derived.primary_class_mastery_level >= 2) {
			slots.push({
				subclass: derived.primary_subclass,
				characterClass: derived.primary_class,
				cardType: 'specialization',
				features: derived.primary_subclass.specialization_card.features
			});
		}
		if (derived.primary_class_mastery_level >= 3) {
			slots.push({
				subclass: derived.primary_subclass,
				characterClass: derived.primary_class,
				cardType: 'mastery',
				features: derived.primary_subclass.mastery_card.features
			});
		}
	}

	if (derived.secondary_subclass) {
		slots.push({
			subclass: derived.secondary_subclass,
			characterClass: derived.secondary_class,
			cardType: 'foundation',
			features: derived.secondary_subclass.foundation_card.features
		});
		if (derived.secondary_class_mastery_level >= 2) {
			slots.push({
				subclass: derived.secondary_subclass,
				characterClass: derived.secondary_class,
				cardType: 'specialization',
				features: derived.secondary_subclass.specialization_card.features
			});
		}
		if (derived.secondary_class_mastery_level >= 3) {
			slots.push({
				subclass: derived.secondary_subclass,
				characterClass: derived.secondary_class,
				cardType: 'mastery',
				features: derived.secondary_subclass.mastery_card.features
			});
		}
	}

	return slots.slice(0, 3);
}

function fillSubclassCards(
	form: ReturnType<PDFDocument['getForm']>,
	derived: DerivedCharacterData
): void {
	const slots = getUnlockedSubclassCardSlots(derived);

	for (let index = 1; index <= 3; index += 1) {
		fillSubclassSlot(form, index, slots[index - 1]);
	}
}

function fillMainPage(
	form: ReturnType<PDFDocument['getForm']>,
	character: Character,
	derived: DerivedCharacterData
): void {
	const primaryClassName =
		derived.primary_class?.title ?? character.derived_descriptors.primary_class_name;
	const secondaryClassName =
		derived.secondary_class?.title ?? character.derived_descriptors.secondary_class_name;
	const className = [primaryClassName, secondaryClassName].filter(Boolean).join(' / ');
	const heritage = [derived.ancestry_card?.title, derived.community_card?.title]
		.filter(Boolean)
		.join(' / ');

	setText(form, 'name', character.name);
	setText(form, 'pronouns', '');
	setText(form, 'heritage', heritage);
	setText(form, 'class', className);
	setText(form, 'level', character.level);
	setText(form, 'evasion', derived.evasion);
	setText(form, 'armor', derived.max_armor);
	setText(form, 'majorDamage', derived.damage_thresholds.major);
	setText(form, 'severeDamage', derived.damage_thresholds.severe);
	setText(form, 'hp_max', derived.max_hp);
	setText(form, 'stress_max', derived.max_stress);
	setText(form, 'hope_feature', featureText(derived.primary_class?.hope_feature));

	for (const trait of TRAITS) {
		setText(form, trait, formatSigned(derived.traits[trait]));
		setCheck(form, `${trait}_marked`, Boolean(character.selected_traits[trait]));
	}

	for (let row = 0; row < 4; row += 1) {
		for (let column = 0; column < 3; column += 1) {
			setCheck(form, `armor_slot.${row}.${column}`, row * 3 + column < character.marked_armor);
		}
	}

	fillCountedChecks(form, 'hp', character.marked_hp, 12);
	fillCountedChecks(form, 'stress', character.marked_stress, 12);
	fillCountedChecks(form, 'hope', character.marked_hope, 6);
	fillCountedChecks(form, 'proficiency', derived.proficiency, 6);
	fillGold(form, character.inventory.gold_coins);

	for (let i = 0; i < 5; i += 1) {
		setText(form, `experience_name.${i}`, character.experiences[i] ?? '');
		setText(form, `experience_bonus.${i}`, formatSigned(derived.experience_modifiers[i]));
	}

	const classFeatures = derived.primary_class?.class_features ?? [];
	for (let i = 0; i < 4; i += 1) {
		setText(form, `classfeature.${i}`, classFeatures[i] ? featureText(classFeatures[i]) : '');
	}

	setCheck(form, 'active_hand_1', Boolean(derived.derived_primary_weapon?.burden));
	setCheck(form, 'active_hand_2', Boolean((derived.derived_primary_weapon?.burden ?? 0) >= 2));
	setText(form, 'primary_weapon_name', derived.derived_primary_weapon?.title ?? '');
	setText(form, 'primary_weapon_trait', formatWeaponTrait(derived.derived_primary_weapon));
	setText(form, 'primary_weapon_damage', formatWeaponDamage(derived.derived_primary_weapon));
	setText(form, 'primary_weapon_feature', formatWeaponFeature(derived.derived_primary_weapon));
	setText(form, 'secondary_weapon_name', derived.derived_secondary_weapon?.title ?? '');
	setText(form, 'secondary_weapon_trait', formatWeaponTrait(derived.derived_secondary_weapon));
	setText(form, 'secondary_weapon_damage', formatWeaponDamage(derived.derived_secondary_weapon));
	setText(form, 'secondary_weapon_feature', formatWeaponFeature(derived.derived_secondary_weapon));

	const armor = derived.derived_armor ?? derived.derived_unarmored;
	fillArmor(form, armor, derived);
	fillInventoryWeapons(form, character, derived);

	setText(
		form,
		'inventory',
		[
			...character.inventory.adventuring_gear.map((item) => {
				const title = typeof item === 'string' ? item : item.title;
				const quantity = typeof item === 'string' ? 1 : (item.quantity ?? 1);
				return `${quantity > 1 ? `${quantity}x ` : ''}${title}`;
			}),
			...derived.inventory_loot.map((item) => `${item.title}: ${stripHtml(item.description_html)}`),
			...derived.inventory_consumables.map(
				(item) =>
					`${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.title}: ${stripHtml(item.description_html)}`
			)
		].join('\n')
	);

	setText(form, 'ancestry_name', derived.ancestry_card?.title ?? '');
	setText(form, 'ancestry_feature_1', featureText(derived.ancestry_card?.features[0]));
	setText(form, 'ancestry_feature_2', featureText(derived.ancestry_card?.features[1]));
	setText(form, 'community_name', derived.community_card?.title ?? '');
	setText(form, 'community_feature', featuresText(derived.community_card?.features));

	fillSubclassCards(form, derived);
}

function fillArmor(
	form: ReturnType<PDFDocument['getForm']>,
	armor: Armor | undefined,
	derived: DerivedCharacterData
): void {
	setText(form, 'armor_name', armor?.title ?? '');
	setText(
		form,
		'armor_thresholds',
		`${derived.damage_thresholds.major} / ${derived.damage_thresholds.severe}`
	);
	setText(form, 'armor_score', armor?.max_armor ?? derived.max_armor);
	setText(form, 'armor_feature', featuresText(armor?.features));
}

function fillCompanion(form: ReturnType<PDFDocument['getForm']>, character: Character): void {
	const companion = character.companion;
	if (!companion) return;

	setText(form, 'companion_name', companion.name);
	setText(form, 'companion_evasion', companion.evasion);
	setText(form, 'companion_attack_name', companion.attack?.name ?? '');
	setText(form, 'companion_attack_range', companion.attack?.range ?? '');
	setCheck(form, 'companion_attack_d6', companion.attack?.damage_dice.includes('d6') ?? false);
	setCheck(form, 'companion_attack_d8', companion.attack?.damage_dice.includes('d8') ?? false);
	setCheck(form, 'companion_attack_d10', companion.attack?.damage_dice.includes('d10') ?? false);
	setCheck(form, 'companion_attack_d12', companion.attack?.damage_dice.includes('d12') ?? false);
	fillUnderscoreCountedChecks(form, 'companion_stress', companion.marked_stress, 6);

	for (let i = 0; i < 5; i += 1) {
		setText(form, `companion_experience_name.${i}`, companion.experiences[i] ?? '');
		setText(
			form,
			`companion_experience_bonus.${i}`,
			formatSigned(companion.experience_modifiers[i])
		);
	}

	const trainingCount = (option: string): number =>
		companion.level_up_choices.filter((choice) => choice === option).length;
	fillUnderscoreCountedChecks(form, 'companion_training_int', trainingCount('intelligent'), 3);
	setCheck(form, 'companion_training_light', trainingCount('light-in-the-dark') > 0);
	setCheck(form, 'companion_training_light_hope', companion.marked_hope > 0);
	setCheck(form, 'companion_training_comfort', trainingCount('creature-comfort') > 0);
	setCheck(form, 'companion_training_armor', trainingCount('armored') > 0);
	fillUnderscoreCountedChecks(form, 'companion_training_vicious', trainingCount('vicious'), 3);
	fillUnderscoreCountedChecks(form, 'companion_training_resilient', trainingCount('resilient'), 3);
	setCheck(form, 'companion_training_bonded', trainingCount('bonded') > 0);
	fillUnderscoreCountedChecks(form, 'companion_training_aware', trainingCount('aware'), 3);
}

async function fillCompanionImage(
	pdf: PDFDocument,
	form: ReturnType<PDFDocument['getForm']>,
	derived: DerivedCharacterData,
	character: Character
): Promise<void> {
	const imageUrl = derived.derived_companion?.image_url || character.companion?.image_url;
	const imageBytes = await fetchImagePngBytes(imageUrl).catch(() => undefined);
	setButtonImage(form, 'companion_image', imageBytes ? await pdf.embedPng(imageBytes) : undefined);
}

function fillMulticlass(
	form: ReturnType<PDFDocument['getForm']>,
	character: Character,
	derived: DerivedCharacterData
): void {
	if (!derived.secondary_class) return;

	setText(form, 'multiclass_class', derived.secondary_class.title);
	setText(form, 'multiclass_domain', capitalize(character.secondary_class_domain_id));
	setText(
		form,
		'multiclass_feature',
		derived.secondary_class.class_features.map(featureText).filter(Boolean).join('\n\n')
	);

	for (let i = 0; i < 5; i += 1) setText(form, `multiclass_feature.${i}`, '');
}

function fillCharacterDetails(
	form: ReturnType<PDFDocument['getForm']>,
	character: Character
): void {
	setText(form, 'details_clothes', character.character_descriptions.clothes);
	setText(form, 'details_eyes', character.character_descriptions.eyes);
	setText(form, 'details_body', character.character_descriptions.body);
	setText(form, 'details_color', character.character_descriptions.skin);
	setText(form, 'details_attitude', character.character_descriptions.attitude);
	setText(form, 'details_notes', character.notes);

	for (let i = 0; i < 3; i += 1) {
		const background = character.background_questions[i];
		const connection = character.connection_questions[i];
		setText(form, `background_q_${i + 1}`, background?.question ?? '');
		setText(form, `background_a_${i + 1}`, background?.answer ?? '');
		setText(form, `connection_q_${i + 1}`, connection?.question ?? '');
		setText(form, `connection_a_${i + 1}`, connection?.answer ?? '');
	}
}

function fillBeastform(
	form: ReturnType<PDFDocument['getForm']>,
	beastform: Beastform | undefined
): void {
	if (!beastform) return;

	setText(form, 'beastform_name', beastform.title);
	setText(form, 'beastform_trait', beastform.character_trait.trait.toUpperCase());
	setText(form, 'beastform_trait_bonus', formatSigned(beastform.character_trait.bonus));
	setText(form, 'beastform_evasion_bonus', formatSigned(beastform.evasion_bonus));
	setText(form, 'beastform_attack_trait', beastform.attack.trait.toUpperCase());
	setText(form, 'beastform_attack_range', beastform.attack.range);
	setText(
		form,
		'beastform_attack_damage',
		`${beastform.attack.damage_dice}${formatSigned(beastform.attack.damage_bonus)} ${beastform.attack.damage_type.toUpperCase()}`
	);
	setText(form, 'beastform_advantages', beastform.advantages.join(', '));
	setText(form, 'beastform_features', featuresText(beastform.features));
}

async function fillDomainImages(
	pdf: PDFDocument,
	form: ReturnType<PDFDocument['getForm']>,
	character: Character,
	derived: DerivedCharacterData
): Promise<void> {
	const primaryDomainUrl = normalizeLocalUrl(
		character.derived_descriptors.primary_class_banner?.primary_domain?.image_url
	);
	const secondaryDomainUrl = normalizeLocalUrl(
		character.derived_descriptors.primary_class_banner?.secondary_domain?.image_url
	);
	const multiclassDomainUrl = normalizeLocalUrl(
		character.secondary_class_domain_id === derived.secondary_class?.primary_domain_id
			? character.derived_descriptors.secondary_class_banner?.primary_domain?.image_url
			: character.derived_descriptors.secondary_class_banner?.secondary_domain?.image_url
	);

	const [primaryDomainPng, secondaryDomainPng, multiclassDomainPng] = await Promise.all([
		fetchWhiteSvgPngBytes(primaryDomainUrl),
		fetchWhiteSvgPngBytes(secondaryDomainUrl),
		fetchWhiteSvgPngBytes(multiclassDomainUrl)
	]);

	setButtonImage(
		form,
		'domain_img_1',
		primaryDomainPng ? await pdf.embedPng(primaryDomainPng) : undefined
	);
	setButtonImage(
		form,
		'domain_img_2',
		secondaryDomainPng ? await pdf.embedPng(secondaryDomainPng) : undefined
	);
	setButtonImage(
		form,
		'domain_img_3',
		multiclassDomainPng ? await pdf.embedPng(multiclassDomainPng) : undefined
	);
}

function keepOnlyPages(pdf: PDFDocument, pageIndexesToKeep: Set<number>): void {
	for (let pageIndex = pdf.getPageCount() - 1; pageIndex >= 0; pageIndex -= 1) {
		if (!pageIndexesToKeep.has(pageIndex)) {
			pdf.removePage(pageIndex);
		}
	}
}

export async function exportOfficialCharacterSheetPdf({
	character,
	derived
}: ExportInput): Promise<void> {
	const sourceBytes = await fetch(BLANK_CHARACTER_SHEET_URL).then((response) => {
		if (!response.ok) {
			throw new Error(`Unable to load blank character sheet PDF (${response.status})`);
		}
		return response.arrayBuffer();
	});

	const pdf = await PDFDocument.load(sourceBytes);
	pdf.setTitle(`Daggerheart Character Sheet | ${character.name}`);
	const form = pdf.getForm();

	fillMainPage(form, character, derived);
	fillMulticlass(form, character, derived);
	fillCompanion(form, character);
	await fillCompanionImage(pdf, form, derived, character);
	fillBeastform(form, derived.derived_beastform);
	fillCharacterDetails(form, character);
	await fillDomainImages(pdf, form, character, derived);

	const vaultCards = derived.domain_card_vault.filter(
		(vaultCard) =>
			!derived.domain_card_loadout.some((loadoutCard) => loadoutCard.id === vaultCard.id)
	);
	fillDomainCards(form, derived.domain_card_loadout, vaultCards);

	const pagesToKeep = new Set([0, 1, 2, 7, 8, 9]);
	if (derived.secondary_class) pagesToKeep.add(3);
	if (derived.hasCompanionSubclassFeature) pagesToKeep.add(4);
	if (derived.hasBeastformClassFeature) {
		pagesToKeep.add(5);
		pagesToKeep.add(6);
	}
	keepOnlyPages(pdf, pagesToKeep);

	form.updateFieldAppearances();
	applyCheckboxAppearances(form);

	const bytes = await pdf.save({ updateFieldAppearances: false });
	const pdfBytes = new Uint8Array(bytes);
	const blob = new Blob([pdfBytes], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${sanitizeFileName(character.name) || 'daggerheart-character'}-sheet.pdf`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
