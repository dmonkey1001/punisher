import type { Handle } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db/init';
import { getUser } from '$lib/server/session';

// Migrate + seed on server startup (first boot initializes the DB).
ensureDb();

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = getUser(event.cookies);
	return resolve(event);
};
