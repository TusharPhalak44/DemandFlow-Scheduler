import dotenv from 'dotenv';

// Load local environment files if present
dotenv.config();

/**
 * Builds the MySQL connection URL from individual DB credentials:
 * DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 * Automatically encodes special characters in username and password.
 * Falls back to DATABASE_URL if individual credentials are not specified.
 */
export function getDatabaseUrl(): string {
  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim() || '3306';
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  const database = process.env.DB_NAME?.trim();

  // If individual DB credentials are provided, construct the URL with URL-encoding
  if (host && user && database) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const auth = encodedPassword ? `${encodedUser}:${encodedPassword}` : encodedUser;
    return `mysql://${auth}@${host}:${port}/${database}`;
  }

  // Fallback to DATABASE_URL if present
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL.trim();
  }

  // Local development default fallback
  return 'mysql://root:@127.0.0.1:3306/meeting_calendar';
}

// Ensure process.env.DATABASE_URL is always set for Prisma and external tools
const dbUrl = getDatabaseUrl();
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  process.env.DATABASE_URL = dbUrl;
}
