import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		users: db.select().from(users).all()
	};
};
