-- chapter_members.joined_at moves client-side: the invitee's browser sets it
-- (encrypted, at accept time) inside the member's encrypted_blob, and the
-- client sorts the member list after decrypting, so the server no longer
-- needs (or sees) it in plaintext.
ALTER TABLE chapter_members DROP COLUMN joined_at;
