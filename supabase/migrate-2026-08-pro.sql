-- ───────────────────────────────────────────────────────────────────
-- tāst Smart Recipe Builder — Pro update migration (Aug 2026)
-- For EXISTING Supabase projects that already ran schema.sql.
-- New projects can skip this — schema.sql is already up to date.
--
-- What it does: widens brew_log.rating from int to numeric(3,1) so the
-- tāst 10-point scale (0.5 steps, e.g. 8.5) and cupping scores fit.
-- Existing 1–5 star ratings are preserved as-is; the app detects legacy
-- entries and normalizes them for analytics.
-- ───────────────────────────────────────────────────────────────────

alter table public.brew_log
  alter column rating type numeric(3,1) using rating::numeric(3,1);
