-- themes.created_at moves client-side: the client now includes createdAt
-- inside the theme's encrypted_blob and sorts the autocomplete list
-- client-side after decrypting, so the server no longer needs (or sees)
-- it in plaintext.
ALTER TABLE themes DROP COLUMN created_at;
