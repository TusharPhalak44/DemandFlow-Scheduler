import { execSync } from 'child_process';
import { getDatabaseUrl } from '../server/dist/config/dbConfig.js';

const url = getDatabaseUrl();
process.env.DATABASE_URL = url;

const args = process.argv.slice(2).join(' ');
console.log(`Executing: npx prisma ${args}`);
execSync(`npx prisma ${args}`, { stdio: 'inherit', env: process.env });
