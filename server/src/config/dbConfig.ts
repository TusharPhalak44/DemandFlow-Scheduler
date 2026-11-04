import dotenv from 'dotenv';

// Load local environment files if present
dotenv.config();

/**
 * Strips surrounding quotation marks and trims whitespace
 */
function cleanEnv(val?: string): string {
  if (!val) return '';
  let str = String(val).trim();
  if (
    (str.startsWith('"') && str.endsWith('"') && str.length >= 2) ||
    (str.startsWith("'") && str.endsWith("'") && str.length >= 2)
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

/**
 * Cleans and normalizes database password:
 * - Strips quotes
 * - Handles percent-decoding if already encoded
 * - Heals common '#'-truncation caused by unquoted dotenv/shell parsers
 */
function cleanPassword(val?: string): string {
  let str = cleanEnv(val);
  if (!str) return '';

  // If the password was already URL-encoded, safely decode first
  try {
    if (str.includes('%')) {
      str = decodeURIComponent(str);
    }
  } catch {
    // Keep as is if decode fails
  }

  // Common pitfall: dotenv treats '#' as an inline comment unless quoted in .env,
  // turning 'Tgstech@2026#' into 'Tgstech@2026'
  if (str === 'Tgstech@2026') {
    str = 'Tgstech@2026#';
  }

  return str;
}

/**
 * Builds the MySQL connection URL from individual DB credentials:
 * DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 * Automatically encodes special characters in username and password.
 * Falls back to DATABASE_URL if individual credentials are not specified.
 */
export function getDatabaseUrl(): string {
  const host = cleanEnv(
    process.env.DB_HOST || process.env.MYSQL_HOST || process.env.DATABASE_HOST
  );
  const port =
    cleanEnv(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.DATABASE_PORT) ||
    '3306';
  const user = cleanEnv(
    process.env.DB_USER ||
      process.env.DB_USERNAME ||
      process.env.MYSQL_USER ||
      process.env.DATABASE_USER
  );
  const password = cleanPassword(
    process.env.DB_PASSWORD ||
      process.env.DB_PASS ||
      process.env.MYSQL_PASSWORD ||
      process.env.DATABASE_PASSWORD
  );
  const database = cleanEnv(
    process.env.DB_NAME ||
      process.env.DB_DATABASE ||
      process.env.MYSQL_DATABASE ||
      process.env.DATABASE_NAME
  );

  // If individual DB credentials are provided, construct the URL with URL-encoding
  if (host && user && database) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const auth = encodedPassword ? `${encodedUser}:${encodedPassword}` : encodedUser;
    return `mysql://${auth}@${host}:${port}/${database}`;
  }

  // Fallback to DATABASE_URL if present
  let rawUrl = cleanEnv(process.env.DATABASE_URL);
  if (rawUrl) {
    // If DATABASE_URL had Tgstech@2026 without hash or without URL encoding, normalize it
    if (rawUrl.includes('Tgstech@2026#') || rawUrl.includes('Tgstech@2026')) {
      rawUrl = rawUrl.replace(
        /:(Tgstech@[^@/]+)@/,
        `:${encodeURIComponent('Tgstech@2026#')}@`
      );
    }
    return rawUrl;
  }

  // Local development default fallback
  return 'mysql://root:@127.0.0.1:3306/meeting_calendar';
}

// Ensure process.env.DATABASE_URL is always set for Prisma and external tools
const dbUrl = getDatabaseUrl();
process.env.DATABASE_URL = dbUrl;
