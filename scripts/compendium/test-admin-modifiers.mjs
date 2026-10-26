// Optional browser regression: requires Playwright (PLAYWRIGHT_MODULE can point
// to its index.mjs). Starts only an owned localhost Vite and migrated scratch DB.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import Database from 'better-sqlite3';

const { chromium } = await import(
	process.env.PLAYWRIGHT_MODULE
		? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href
		: 'playwright'
);
const root = fileURLToPath(new URL('../../', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'daggerlore-admin-modifiers-'));
const artifacts = process.env.ADMIN_MODIFIER_TEST_ARTIFACTS
	? resolve(process.env.ADMIN_MODIFIER_TEST_ARTIFACTS)
	: scratch;
mkdirSync(artifacts, { recursive: true });
const database = join(scratch, 'test.db');
const user = '10000000-0000-4000-8000-000000000106';
const session = 'admin-modifiers-test-session';
const reserve = createServer();
await new Promise((resolve, reject) => {
	reserve.once('error', reject);
	reserve.listen(0, '127.0.0.1', resolve);
});
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const base = `http://127.0.0.1:${port}`;
const env = {
	...process.env,
	DATABASE_URL: `file:${database}`,
	SQLITE_MIGRATIONS_DIR: join(root, 'drizzle/sqlite'),
	AUTH_SECRET: 'isolated-admin-modifier-test-secret',
	AUTH_URL: base,
	PUBLIC_ORIGIN: base,
	ADMIN_EMAIL: 'admin-modifiers@example.test',
	ADMIN_USER_ID: user,
	MAINTENANCE_MODE: 'false',
	SENTRY_DSN: '',
	PUBLIC_SENTRY_DSN: '',
	DAGGERLORE_DEV_GATEWAY: 'false',
	PORT: String(port)
};
const migrate = spawnSync(process.execPath, ['scripts/migrate-sqlite.mjs'], {
	cwd: root,
	env,
	encoding: 'utf8'
});
assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
const db = new Database(database);
db.prepare('insert into users(id,email,name,is_admin,invite_accepted_at) values (?,?,?,1,?)').run(
	user,
	'admin-modifiers@example.test',
	'Test admin',
	Date.now()
);
db.prepare('insert into sessions(session_token,user_id,expires) values (?,?,?)').run(
	session,
	user,
	Date.now() + 3600000
);
for (const [key, name] of [
	['HAF', 'Hope and Fear'],
	['SRD', 'System Reference Document']
]) {
	db.prepare('insert into official_sources(source_key,metadata,enabled) values (?,?,1)').run(
		key,
		JSON.stringify({ source_key: key, name, short_title: key })
	);
}
const feature = (title, text) => ({
	title,
	description_html: `<p>${text}</p>`,
	character_modifiers: [],
	weapon_modifiers: []
});
const shield = {
	source_key: 'HAF',
	title: 'Rune Shield',
	description_html: '',
	level_requirement: 1,
	type: 'Magical',
	available_traits: ['knowledge'],
	range: 'Melee',
	features: [
		{
			...feature('Protective', '+1 to Armor Score'),
			usage: { id: 'retained_usage', max_uses: 2, reset: 'long_rest' }
		},
		feature('Unchanged feature', 'Keep this feature.')
	],
	attack_roll_bonus: 0,
	damage_bonus: 0,
	damage_dice: '1d4',
	available_damage_types: ['mag'],
	burden: 1
};
const robes = {
	source_key: 'HAF',
	title: 'Mage Robes',
	description_html: '',
	level_requirement: 1,
	max_armor: 2,
	damage_thresholds: { major: 4, severe: 10 },
	features: [feature('Enchanted', 'Gain a bonus to thresholds equal to your Spellcast trait.')]
};
const loot = {
	source_key: 'HAF',
	title: 'Test Charm',
	rarity_roll: 1,
	description_html: '<p>Keep charm text.</p>',
	character_modifiers: [],
	weapon_modifiers: []
};
for (const [kind, id, item] of [
	['secondary_weapons', 'rune_shield', shield],
	['armor', 'mage_robes', robes],
	['loot', 'test_charm', loot]
]) {
	db.prepare(
		'insert into official_compendium_items(source_key,item_type,item_id,current_version) values (?,?,?,1)'
	).run('HAF', kind, id);
	db.prepare(
		'insert into official_compendium_item_versions(source_key,item_type,item_id,item_version,label,item) values (?,?,?,1,?,?)'
	).run('HAF', kind, id, 'Initial', JSON.stringify(item));
}
db.close();
const log = openSync(join(artifacts, 'admin-modifiers-vite.log'), 'w');
const server = spawn(
	process.execPath,
	['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
	{ cwd: root, env, stdio: ['ignore', log, log] }
);
let browser;
let page;
try {
	for (let i = 0; ; i++) {
		if (server.exitCode !== null)
			throw new Error(readFileSync(join(artifacts, 'admin-modifiers-vite.log'), 'utf8'));
		try {
			await fetch(base);
			break;
		} catch (error) {
			if (i >= 100) throw error;
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
	}
	browser = await chromium.launch({
		headless: true,
		...(process.env.CHROMIUM_EXECUTABLE_PATH
			? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
			: {})
	});
	const context = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
	await context.addCookies([{ name: 'authjs.session-token', value: session, url: base }]);
	page = await context.newPage();
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const save = page.getByRole('button', { name: 'Save', exact: true });
	const getItem = async (kind, id, version) => {
		const inspect = new Database(database, { readonly: true });
		try {
			const row = inspect
				.prepare(
					'select v.item, i.current_version from official_compendium_items i join official_compendium_item_versions v on v.source_key=i.source_key and v.item_type=i.item_type and v.item_id=i.item_id and v.item_version=coalesce(?,i.current_version) where i.source_key=? and i.item_type=? and i.item_id=?'
				)
				.get(version ?? null, 'HAF', kind, id);
			assert.ok(row, `Missing persisted ${kind}/${id}`);
			return { current_version: row.current_version, item: JSON.parse(row.item) };
		} finally {
			inspect.close();
		}
	};
	const publish = async () => {
		const response = page.waitForResponse(
			(response) =>
				response.url().endsWith('/api/app/admin/compendium/items') &&
				response.request().method() === 'PATCH'
		);
		await save.click();
		const result = await response;
		if (!result.ok())
			throw new Error(
				`Publish failed (${result.status()}): ${await result.text().catch((error) => error.message)}; payload: ${result.request().postData()}`
			);
		await page.waitForFunction(() =>
			[...document.querySelectorAll('button')].some(
				(button) => button.textContent.trim() === 'Save' && button.disabled
			)
		);
	};
	const choose = async (group, index, name) => {
		await group.locator('[data-slot="select-trigger"]').nth(index).click();
		await page.getByRole('option', { name, exact: true }).click();
	};
	await page.goto(`${base}/admin/compendium/secondary_weapons/rune_shield`);
	await page.getByLabel('Title', { exact: true }).waitFor();
	assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Rune Shield');
	const characters = page.getByRole('region', { name: 'Character modifiers', exact: true }).first();
	await characters.getByRole('button', { name: 'Add Character Modifier', exact: true }).waitFor();
	assert.equal(await save.isDisabled(), true, 'Opening the editor must not dirty the item');
	await characters.getByRole('button', { name: 'Add Character Modifier', exact: true }).click();
	const character = page.getByRole('group', { name: 'Character modifier 1', exact: true });
	await choose(character, 0, 'Max Armor');
	await character.getByLabel('Value', { exact: true }).fill('1');
	await publish();
	let persisted = await getItem('secondary_weapons', 'rune_shield');
	assert.equal(persisted.current_version, 2);
	assert.deepEqual(persisted.item.features[0].character_modifiers, [
		{ behaviour: 'bonus', character_conditions: [], type: 'flat', value: 1, target: 'max_armor' }
	]);
	assert.deepEqual(persisted.item.features[0].usage, shield.features[0].usage);
	assert.deepEqual(persisted.item.features[1], shield.features[1]);
	assert.equal(persisted.item.features[0].description_html, shield.features[0].description_html);
	await page.reload();
	await character.getByLabel('Value', { exact: true }).waitFor();
	assert.equal(await character.getByLabel('Value', { exact: true }).inputValue(), '1');
	await page
		.getByRole('region', { name: 'Weapon modifiers', exact: true })
		.first()
		.getByRole('button', { name: 'Add Weapon Modifier', exact: true })
		.click();
	const weapon = page.getByRole('group', { name: 'Weapon modifier 1', exact: true });
	await choose(weapon, 0, 'Primary');
	await choose(weapon, 1, 'Damage Bonus');
	await weapon.getByLabel('Value', { exact: true }).fill('2');
	await publish();
	persisted = await getItem('secondary_weapons', 'rune_shield');
	assert.equal(persisted.current_version, 3);
	assert.equal(persisted.item.features[0].weapon_modifiers[0].value, 2);
	await weapon.getByRole('button', { name: 'Delete Weapon Modifier', exact: true }).click();
	await character.getByLabel('Value', { exact: true }).fill('2');
	await publish();
	persisted = await getItem('secondary_weapons', 'rune_shield');
	assert.equal(persisted.item.features[0].character_modifiers[0].value, 2);
	assert.deepEqual(persisted.item.features[0].weapon_modifiers, []);
	assert.deepEqual(persisted.item.features[0].usage, shield.features[0].usage);
	assert.deepEqual(
		(await getItem('secondary_weapons', 'rune_shield', 1)).item,
		shield,
		'Historical versions must not change'
	);
	await page.screenshot({
		path: join(artifacts, 'rune-shield-modifier-editor.png'),
		fullPage: true
	});

	await page.goto(`${base}/admin/compendium/armor/mage_robes`);
	await page.getByLabel('Title', { exact: true }).waitFor();
	assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Mage Robes');
	for (const [i, target] of ['Major Damage Threshold', 'Severe Damage Threshold'].entries()) {
		await page.getByRole('button', { name: 'Add Character Modifier', exact: true }).click();
		const group = page.getByRole('group', { name: `Character modifier ${i + 1}`, exact: true });
		await choose(group, 0, target);
		await choose(group, 2, 'Derived from Spellcast Trait');
		await group.getByLabel('Multiplier', { exact: true }).fill('1');
	}
	assert.equal(await page.locator('[id$="-multiplier"]').count(), 2);
	assert.equal(
		new Set(
			await page
				.locator('[id$="-multiplier"]')
				.evaluateAll((inputs) => inputs.map((input) => input.id))
		).size,
		2,
		'Each modifier input needs a unique associated label'
	);
	await publish();
	persisted = await getItem('armor', 'mage_robes');
	assert.equal(persisted.current_version, 2);
	assert.deepEqual(
		persisted.item.features[0].character_modifiers.map((modifier) => [
			modifier.target,
			modifier.type,
			modifier.multiplier
		]),
		[
			['major_damage_threshold', 'derived_from_spellcast_trait', 1],
			['severe_damage_threshold', 'derived_from_spellcast_trait', 1]
		]
	);
	assert.deepEqual(persisted.item.damage_thresholds, robes.damage_thresholds);
	await page.reload();
	await page.getByRole('group', { name: 'Character modifier 2', exact: true }).waitFor();
	assert.equal(await page.getByText('Derived from Spellcast Trait', { exact: true }).count(), 2);
	await page.screenshot({
		path: join(artifacts, 'mage-robes-modifier-editor.png'),
		fullPage: true
	});
	await page
		.getByRole('group', { name: 'Character modifier 1', exact: true })
		.getByRole('button', { name: 'Delete Character Modifier', exact: true })
		.click();
	await publish();
	persisted = await getItem('armor', 'mage_robes');
	assert.equal(persisted.item.features[0].character_modifiers.length, 1);
	assert.equal(persisted.item.features[0].character_modifiers[0].target, 'severe_damage_threshold');
	assert.deepEqual(
		(await getItem('armor', 'mage_robes', 1)).item,
		robes,
		'Historical versions must not change'
	);

	await page.goto(`${base}/admin/compendium/loot/test_charm`);
	await page.getByLabel('Title', { exact: true }).waitFor();
	assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), 'Test Charm');
	await page.getByRole('button', { name: 'Add Character Modifier', exact: true }).click();
	await page
		.getByRole('group', { name: 'Character modifier 1', exact: true })
		.getByLabel('Value', { exact: true })
		.fill('1');
	await publish();
	persisted = await getItem('loot', 'test_charm');
	assert.equal(persisted.item.character_modifiers[0].value, 1);
	assert.equal(persisted.item.description_html, loot.description_html);
	assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`);
	console.log(
		'PASS: real admin equipment/loot add/edit/remove, unique input labels, new-version publication and reload persistence; existing feature data retained.'
	);
} catch (error) {
	if (page) {
		console.error('Failed browser page:', page.url(), await page.locator('body').innerText());
		await page.screenshot({ path: join(artifacts, 'failure.png'), fullPage: true });
	}
	throw error;
} finally {
	if (browser) await browser.close();
	server.kill('SIGTERM');
	await Promise.race([
		new Promise((resolve) => server.once('exit', resolve)),
		new Promise((resolve) => setTimeout(resolve, 5000))
	]);
	if (server.exitCode === null) server.kill('SIGKILL');
	closeSync(log);
	rmSync(scratch, { recursive: true, force: true });
}
