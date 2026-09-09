-- chapters.created_at moves client-side: the client now includes createdAt
-- inside the chapter's encrypted_blob and sorts "my chapters" after
-- decrypting, so the server no longer needs (or sees) it in plaintext.
ALTER TABLE chapters DROP COLUMN created_at;
