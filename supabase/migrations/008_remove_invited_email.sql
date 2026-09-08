-- Invites are link-only: anyone holding the token can accept, so there is no
-- specific invited email to store or enforce (see documentation/Invite-Plan.md).
DROP INDEX IF EXISTS chapter_invitations_pending_unique;
ALTER TABLE chapter_invitations
    DROP COLUMN invited_email;
