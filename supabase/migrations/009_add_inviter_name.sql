-- Store the inviter's name on the invite record so invitees can see who invited them
ALTER TABLE chapter_invitations
    ADD COLUMN inviter_name TEXT DEFAULT '';
