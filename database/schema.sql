-- Table used by both workflows.
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id               SERIAL PRIMARY KEY,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  email            TEXT NOT NULL,
  recommended_plan TEXT,
  answers          JSONB NOT NULL,
  followed_up_at   TIMESTAMPTZ          -- set by the Leads Dashboard follow-up endpoint
);

CREATE INDEX IF NOT EXISTS quiz_submissions_created_at_idx
  ON quiz_submissions (created_at DESC);
