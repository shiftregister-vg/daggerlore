# Daggerlore

Daggerlore is a DNDBeyond-style set of digital tools for the Daggerheart TTRPG. This software is available through the MIT license (see the license in the repo).

Daggerlore includes materials from the Daggerheart System Reference Document 1.0, © Critical Role, LLC. under the terms of the Darrington Press Community Gaming (DPCGL) License. More information can be found at https://www.daggerheart.com. There are no previous modifications by others

This repo includes character, campaign, encounter, homebrew, stream overlay, admin, and feedback tools, as well as a markdown-style blog.

Basic Stack:
- PostgreSQL in production and SQLite for local development
- Sveltekit (fullstack framework)
- Node server deployment target
- Google OAuth through Auth.js

## Prerequisites
- NPM (node 24 or later)
- PostgreSQL 15 or later for deployed environments
- A Google OAuth client for authentication

## Install

```bash
npm install
```

## Environment
There is a `.env.example` file in the repo that you can use as a template to set up your own `.env.local` environment file.

## Google OAuth Setup

Create a Google OAuth client and copy its client id and client secret into the
environment as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Add this authorized redirect URI to the Google OAuth client:

```text
https://your-domain.example/auth/callback/google
```

## Database Setup

The app chooses the database driver from `DATABASE_URL`.

- PostgreSQL: use a `postgres://...` or `postgresql://...` connection string.
- SQLite: use a `file:...` connection string, for example `file:./data/local.db`.

For local SQLite development:

```bash
cp .env.example .env.local
# Set DATABASE_URL=file:./data/local.db in .env.local
npm run db:migrate
```

For PostgreSQL development or deployment, create the database first, set
`DATABASE_URL`, then run the same migration command:

```bash
createdb daggerlore
DATABASE_URL=postgres://daggerlore:password@localhost:5432/daggerlore npm run db:migrate
```

The app does not need a separate seed command. On first access to official
compendium data, it inserts the built-in SRD data if the compendium tables are
empty.

## PostgreSQL Deployment

These steps assume a server that already has Node 24 or later, npm, and
PostgreSQL installed.

1. Create the database and application user:

```sql
create user daggerlore with password 'replace-with-a-strong-password';
create database daggerlore owner daggerlore;
```

2. Set production environment variables:

```bash
PUBLIC_ORIGIN=https://your-domain.example
DATABASE_URL=postgres://daggerlore:replace-with-a-strong-password@localhost:5432/daggerlore
AUTH_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
MAINTENANCE_MODE=false
ADMIN_USER_ID=
ADMIN_EMAIL=you@example.com
BODY_SIZE_LIMIT=10M
PORT=3000
```

`AUTH_SECRET` should be a long random value. For example:

```bash
openssl rand -base64 32
```

`BODY_SIZE_LIMIT` must be above SvelteKit's default `512K` limit for admin
compendium import/export JSON uploads. `10M` is enough for current full
compendium exports with room to grow.

3. Install dependencies, run migrations, and build:

```bash
npm ci
npm run db:migrate
npm run build
```

4. Start the built Node server:

```bash
node build
```

For a real deployment, run `node build` under a process manager such as systemd,
PM2, or your platform's Node runtime. The process must receive the same
environment variables used for `npm run db:migrate`. Set `PORT` to control the
port the Node server listens on.

5. Put a reverse proxy in front of the Node process and forward HTTPS traffic to
the app. Make sure `PUBLIC_ORIGIN` exactly matches the external URL users open
in their browser.

6. For the first production admin, set `ADMIN_EMAIL` to the Google account email
you will use to sign in. The app will mark that matching user as admin and
invite-accepted on first request after Google auth. You can provide multiple
bootstrap admins as a comma-separated list.

If you prefer to grant admin manually, sign in once with Google so the app
creates your user row, then run:

```sql
update users set is_admin = true where email = 'you@example.com';
```

The app is invite-only. After the first admin is configured, use the admin
interface to create invite links for additional users.

### Feedback GitHub integration

The Feedback Manager can create and synchronize issues through a GitHub App.
Create an app with **Metadata: read-only** and **Issues: read and write**
repository permissions, subscribe it to the **Issues** event, and install it
only on the target repository.

Configure these runtime variables:

```bash
GITHUB_FEEDBACK_ENABLED=true
GITHUB_FEEDBACK_WEBHOOKS_ENABLED=true
GITHUB_REPOSITORY=shiftregister-vg/daggerlore
GITHUB_APP_ID=123456
GITHUB_APP_INSTALLATION_ID=12345678
GITHUB_APP_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...'
GITHUB_WEBHOOK_SECRET=replace-with-a-long-random-secret
```

Set the GitHub App webhook URL to:

```text
https://your-domain.example/api/integrations/github/webhook
```

Only the primary production environment should set
`GITHUB_FEEDBACK_WEBHOOKS_ENABLED=true`. Preview environments may enable
outbound issue actions with the same GitHub App credentials, but must use the
Feedback Manager's **Refresh** action to import issue state. Run
`npm run db:migrate` before deploying the application changes.

## Run The App

Start the SvelteKit dev server in a second terminal:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Cloudflare And R2

The normal Vite dev server is enough for most frontend and app work. Image
upload and image proxy routes depend on Cloudflare platform bindings for
`R2_IMAGES` and `R2_USERCONTENT`; without those bindings, those routes will
return a dependency unavailable response.

To test closer to the Cloudflare runtime, build first and then run Wrangler:

```bash
npm run build
npx wrangler dev
```

You will also need Cloudflare credentials and R2 bucket bindings configured for
your own account.

## Sentry
You will need to update `/src/hooks.server.ts` with your Sentry DSN url.
Also you will need to update `/vite.config.ts` with your sentry org and project names

## Troubleshooting

- `PUBLIC_ORIGIN environment variable is not set`: add `PUBLIC_ORIGIN=http://localhost:5173`
  to `.env.local` and restart the dev server.
- The app redirects to `/maintenance`: set `MAINTENANCE_MODE=false`, or set
  `ADMIN_CLERK_ID` to the signed-in Clerk user id.
- Image upload fails locally: run with Cloudflare/R2 bindings or avoid upload
  features during normal Vite development.
