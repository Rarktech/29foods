-- First-run product tour: which tours/tips this user has finished or skipped, keyed by
-- name with the time it happened, e.g. {"homeTour": "2026-10-05T12:00:00Z"}. Stored on
-- the account so a tour seen on one phone doesn't replay on another. Users can already
-- read their own row (users select own); writes go through /api/onboarding (service role).
alter table users add column onboarding jsonb not null default '{}';
