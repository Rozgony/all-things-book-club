# E2EE Frontend To-Do

## api/topics.ts
- [x] Fix `API_BASE` port: `3000` → `8080`
- [x] `createTopic`: encrypt `{ title, description }` with `getChapterKey(chapterId)` before sending — send `encryptedBlob + nonce`, not plaintext. Needs `chapterId` (look it up from meeting or pass it in).
- [x] `updateTopicStatus`: currently only sends `wheelStatus` (plaintext — this is fine, server needs it). No blob change needed unless you also allow editing title/description.
- [-] Add `getTopicsByMeeting(meetingId)` if topics ever need to be fetched independently (currently they come embedded in `getMeetingById`).

## api/chapters.ts
- [x] `updateChapter`: currently sends plaintext `{ name, description }` — needs to encrypt with `getChapterKey(id)` and send `encryptedBlob + nonce` instead (marked TODO in the file).

## api/users.ts
- [x] Confirm `API_BASE` points to port `8080`.

## Key Store / Session
- [x] On page reload, the in-memory key store (`keyStore.ts`) is wiped. Users will see encrypted blobs instead of content. You need a strategy for this:
  - [x] **Option A**: Re-derive the key on reload by prompting for password again (re-login flow).
  - [x] **Option B**: Store the derived key in `sessionStorage` (survives reload, cleared on tab close).
  - [x] **Option C**: Redirect to login if `hasUserKey()` is false on any protected page.

## Chapter Key Bootstrap
- [x] `getChapters` / `getChapter`: the chapter key is fetched from `chapter_members.encrypted_chapter_key` + `key_nonce`, but this decryption step is not implemented yet. Currently `getChapterKey(id)` assumes the key is already in the store (set during `createChapter`). On a fresh session you need to:
  1. Fetch the chapter (which includes `encryptedChapterKey` + `keyNonce`)
  2. Call `decryptChapterKey(encryptedChapterKey, keyNonce, userKey)` to recover the chapter key
  3. Call `setChapterKey(chapter.id, key)` before decrypting content

## pages/MeetingPage.tsx
- [x] `createTopic` call passes `meetingId` and plaintext `title` — update once `api/topics.ts` is updated for E2EE. Will also need the `chapterId` (available from `meeting.chapterId`).

## Themes (not yet started)
- [ ] Create `api/themes.ts`:
  - `getChapterThemes(chapterId)`: fetch, decrypt each theme name with chapter key
  - `createTheme(chapterId, name)`: encrypt name, POST to `/api/chapters/{id}/themes`
  - `linkTheme(topicId, themeId)`: POST to `/api/topics/{id}/themes` with `{ themeId }`
  - `linkNewTheme(topicId, chapterId, name)`: encrypt name, POST with `{ encryptedBlob, nonce }`
  - `removeTheme(topicId, themeId)`: DELETE `/api/topics/{id}/themes/{themeId}`
