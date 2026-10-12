// Runs before every test file: quiet, deterministic, no background jobs or network enrichment.
process.env.NODE_ENV = 'test';
process.env.JOBS_ENABLED = 'false';
process.env.ENRICH_LINKS = 'false';
process.env.SEED_ON_START = 'false';
process.env.MONGODB_URI = '';
