import { redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, type User } from './db/schema';

export const USER_COOKIE = 'punisher_user';

export function getUser(cookies: RequestEvent['cookies']): User | null {
	const id = cookies.get(USER_COOKIE);
	if (!id) return null;
	return db.select().from(users).where(eq(users.id, id)).get() ?? null;
}

export function setUser(cookies: RequestEvent['cookies'], userId: string): void {
	cookies.set(USER_COOKIE, userId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		// Served over plain HTTP on the LAN — SvelteKit would otherwise default
		// to Secure in production, which browsers drop over http (breaking login).
		secure: false,
		maxAge: 60 * 60 * 24 * 365
	});
}

export function clearUser(cookies: RequestEvent['cookies']): void {
	cookies.delete(USER_COOKIE, { path: '/' });
}

/** Require a selected profile, or bounce to the profile picker. */
export function requireUser(event: RequestEvent): User {
	if (!event.locals.user) throw redirect(303, '/');
	return event.locals.user;
}
