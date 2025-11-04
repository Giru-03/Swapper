import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = async () => {
  return await pool.connect();
};

// Initialize DB Schema only when a DATABASE_URL is provided. Avoid performing
// initialization at import time in serverless environments where the DB may
// not be available or environment variables may be intentionally omitted.
if (process.env.DATABASE_URL) {
  (async () => {
    try {
      console.log('Initializing database schema...');

      // Create users table
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Users table created');

      // Create events table
      await query(`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'BUSY',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Events table created');

      // Create swap_requests table
      await query(`
        CREATE TABLE IF NOT EXISTS swap_requests (
          id SERIAL PRIMARY KEY,
          requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          responder_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          requester_slot_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
          responder_slot_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Swap requests table created');
      console.log('Database initialization complete!');
    } catch (err) {
      // Log initialization errors but do not call process.exit in serverless
      // environments — let requests fail gracefully so the function can
      // report errors rather than aborting the runtime.
      console.error('Error initializing database:', err);
    }
  })();
} else {
  console.warn('DATABASE_URL not configured — skipping DB initialization (safe in serverless mode)');
}