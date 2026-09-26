import { query } from './src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;');
    console.log('Columns added successfully');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
