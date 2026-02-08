-- Add focus flag for priority/focus notes.
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS focus BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional index for fast filtering of focus notes per user.
CREATE INDEX IF NOT EXISTS idx_notes_user_focus ON notes(user_id, focus);
