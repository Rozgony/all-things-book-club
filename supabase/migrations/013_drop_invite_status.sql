-- Invites are now hard-deleted on accept, reject, and expiry instead of
-- being marked with a status, so every remaining row is implicitly PENDING.
ALTER TABLE chapter_invitations DROP COLUMN status;
