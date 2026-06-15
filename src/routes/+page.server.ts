import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { setUser } from '$lib/server/session';

export const actions: Actions = {
	select: async ({ request, cookies }) => {
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		if (userId) setUser(cookies, userId);
		throw redirect(303, '/home');
	}
};
