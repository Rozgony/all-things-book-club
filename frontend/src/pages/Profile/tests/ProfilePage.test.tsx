import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePage } from '../ProfilePage'
import { useAuthStore } from '../../../store/authStore'
import { getMyProfile, updateMyProfile } from '../../../api/users'
import { getChapters } from '../../../api/chapters'
import { supabase } from '../../../lib/supabase'
import type { Chapter, UserProfile } from '../../../api/types'

const setTimezoneMock = vi.fn()

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../../components/Nav', () => ({
  Nav: () => <div data-testid="nav" />,
}))

vi.mock('../../../components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="spinner" />,
}))

vi.mock('../ChapterCard', () => ({
  ChapterCard: ({ chapter }: { chapter: Chapter }) => <div>chapter:{chapter.name}</div>,
}))

vi.mock('../CreateChapterForm', () => ({
  CreateChapterForm: ({
    onChapterCreated,
  }: {
    onChapterCreated: (chapter: Chapter) => void
  }) => (
    <button
      onClick={() =>
        onChapterCreated({
          id: 'c-new', creatorId: 'u1', isPublic: false, encryptedBlob: null, nonce: null,
          encryptedChapterKey: null, keyNonce: null, name: 'New Chapter', description: null, createdAt: '2026-01-01T00:00:00.000Z',
        })
      }
    >
      Submit new chapter
    </button>
  ),
}))

vi.mock('../ProfileSection', () => ({
  ProfileSection: ({
    profile,
    error,
    onSave,
  }: {
    profile: UserProfile
    error: string | null
    onSave: (e: React.FormEvent) => void
  }) => (
    <div data-testid="profile-section">
      <span>profile:{profile.name}</span>
      {error && <span>{error}</span>}
      <button onClick={(e) => onSave(e as never)}>Submit save</button>
    </div>
  ),
}))

vi.mock('../../../api/users', () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
}))

vi.mock('../../../api/chapters', () => ({
  getChapters: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}))

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { id: 'u1', email: 'alex@example.com', name: 'Alex', avatarUrl: null, timezone: 'America/Los_Angeles', ...overrides }
}

describe('ProfilePage', () => {
  beforeEach(() => {
    setTimezoneMock.mockClear()
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({ user: { email: 'alex@example.com' }, setTimezone: setTimezoneMock } as never)
    )
    vi.mocked(getChapters).mockResolvedValue([])
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ error: null } as never)
  })

  it('shows a loading state until the profile has loaded', () => {
    vi.mocked(getMyProfile).mockReturnValue(new Promise(() => {}))
    render(<ProfilePage />)
    expect(screen.getByText('Loading profile…')).toBeInTheDocument()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders the profile section and chapters once loaded', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(makeProfile())
    vi.mocked(getChapters).mockResolvedValue([
      { id: 'c1', creatorId: 'u1', isPublic: false, encryptedBlob: null, nonce: null, encryptedChapterKey: null, keyNonce: null, name: 'Sci-Fi Club', description: null, createdAt: '2026-01-01T00:00:00.000Z' },
    ])
    render(<ProfilePage />)

    expect(await screen.findByTestId('profile-section')).toHaveTextContent('profile:Alex')
    expect(screen.getByText('chapter:Sci-Fi Club')).toBeInTheDocument()
  })

  it('shows an empty state when the user has no chapters', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(makeProfile())
    render(<ProfilePage />)
    expect(await screen.findByText("You haven't joined any chapters yet.")).toBeInTheDocument()
  })

  it('shows an error message when loading chapters fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(makeProfile())
    vi.mocked(getChapters).mockRejectedValue(new Error('boom'))
    render(<ProfilePage />)
    expect(await screen.findByText('Failed to load chapters')).toBeInTheDocument()
  })

  it('toggles the create-chapter form and prepends a newly created chapter', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(makeProfile())
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.click(await screen.findByRole('button', { name: '+ New Chapter' }))
    expect(screen.getByRole('button', { name: 'Submit new chapter' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Submit new chapter' }))
    expect(await screen.findByText('chapter:New Chapter')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit new chapter' })).not.toBeInTheDocument()
  })

  it('saves profile changes including timezone validation', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(makeProfile())
    vi.mocked(updateMyProfile).mockResolvedValue(makeProfile({ name: 'Alex Updated' }))
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.click(await screen.findByRole('button', { name: 'Submit save' }))

    await waitFor(() => expect(updateMyProfile).toHaveBeenCalledWith({ name: 'Alex', timezone: 'America/Los_Angeles' }))
    expect(setTimezoneMock).toHaveBeenCalledWith('America/Los_Angeles')
  })

  it('shows an error when saving the profile fails', async () => {
    vi.mocked(getMyProfile).mockResolvedValue(makeProfile())
    vi.mocked(updateMyProfile).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.click(await screen.findByRole('button', { name: 'Submit save' }))
    expect(await screen.findByText('Failed to save profile')).toBeInTheDocument()
  })
})
