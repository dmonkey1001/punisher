import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { setUser } from '$lib/server/session';
import { PROFILE_COLORS } from '$lib/profile-colors';

export const actions: Actions = {
	select: async ({ request, cookies }) => {
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		if (userId) setUser(cookies, userId);
		throw redirect(303, '/home');
	},

	create: async ({ request, cookies }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name || name.length > 30) {
			return fail(400, { message: 'Name is required (max 30 characters).' });
		}
		const rawColor = String(form.get('color') ?? '');
		const color = /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : PROFILE_COLORS[0];

		const id = crypto.randomUUID();
		db.insert(users).values({ id, name, color }).run();
		setUser(cookies, id);
		throw redirect(303, '/home');
	}
};
