# E2EE Frontend To-Do

### Refactoring Steps
**User** 
- ✅ Seed user
- ✅ Update user
- ✅ Add User name/email to chapter_member

**Meetings** 
- ✅ Schedule Meeting

**Chapter** 
- ✅ Edit Chapter Return

## Themes (not yet started)
- ✅ Create `api/themes.ts`
- ⬜ `getChapterThemes(chapterId)`: fetch, decrypt each theme name with chapter key
- ⬜ `createTheme(chapterId, name)`: encrypt name, POST to `/api/chapters/{id}/themes`
- ⬜ `linkTheme(topicId, themeId)`: POST to `/api/topics/{id}/themes` with `{ themeId }`
- ⬜ `linkNewTheme(topicId, chapterId, name)`: encrypt name, POST with `{ encryptedBlob, nonce }`
- ⬜ `removeTheme(topicId, themeId)`: DELETE `/api/topics/{id}/themes/{themeId}`
