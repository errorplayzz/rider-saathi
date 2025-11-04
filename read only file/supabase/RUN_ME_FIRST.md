Run these steps in order to restore your Supabase schema and policies.

1) Open Supabase Dashboard → SQL Editor.
2) Run the file `supabase/schema.sql` (this file in the repo has idempotent DROP/CREATE for triggers and policies and casts auth.uid()::uuid where required).
3) If you want the extra fixes (functions/policies), you can run the backup SQL from `sql_backups/` (they are copies of the previous fix files).

Notes:
- I moved the three SQL files from the repository root into `sql_backups/` so the repo root is cleaned but your original SQL is preserved.
- If you previously deleted queries from the Supabase SQL editor, re-running `supabase/schema.sql` will recreate the tables, triggers, functions and policies.
- Always back up your database before applying schema changes in production.

Next steps I can take for you:
- Create a single `supabase/apply_all.sql` that includes and re-applies everything in the right order (idempotent).
- Backfill data from `bike_details` JSONB into the new `bike_*` columns and add triggers to keep them in sync.
- Run verification queries (paste output here) and I will analyze.
