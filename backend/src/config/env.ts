const required = (name: string): string => {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required environment variable: ${name}`)
	return value
}

export const env = {
	port: parseInt(process.env.PORT ?? '3000', 10),
	databaseUrl: required('DATABASE_URL'),
	supabaseUrl: required('SUPABASE_URL'),
	supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
}
