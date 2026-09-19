import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberNameModal } from '../MemberNameModal'
import { getChapterKey } from '../../lib/keyStore'
import { decrypt } from '../../lib/crypto'

vi.mock('../../lib/keyStore', () => ({
  getChapterKey: vi.fn(),
}))

vi.mock('../../lib/crypto', () => ({
  decrypt: vi.fn(),
}))

describe('MemberNameModal', () => {
  beforeEach(() => {
    vi.mocked(getChapterKey).mockReturnValue({} as CryptoKey)
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <MemberNameModal isOpen={false} initialName="Alex" chapter={{ id: 'c1' }} onSave={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the initial name when there is no encrypted blob to decrypt', () => {
    render(<MemberNameModal isOpen initialName="Alex" chapter={{ id: 'c1', name: 'Book Club' }} onSave={vi.fn()} />)
    expect(screen.getByDisplayValue('Alex')).toBeInTheDocument()
    expect(screen.getByText('Your name in Book Club')).toBeInTheDocument()
  })

  it('decrypts and shows the stored name when a blob is present', async () => {
    vi.mocked(decrypt).mockResolvedValue({ name: 'Decrypted Name' })
    render(
      <MemberNameModal
        isOpen
        initialName="Alex"
        memberEncryptedBlob="blob"
        memberNonce="nonce"
        chapter={{ id: 'c1' }}
        onSave={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByDisplayValue('Decrypted Name')).toBeInTheDocument())
  })

  it('falls back to the initial name if decryption fails', async () => {
    vi.mocked(decrypt).mockRejectedValue(new Error('bad key'))
    render(
      <MemberNameModal
        isOpen
        initialName="Alex"
        memberEncryptedBlob="blob"
        memberNonce="nonce"
        chapter={{ id: 'c1' }}
        onSave={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByDisplayValue('Alex')).toBeInTheDocument())
  })

  it('calls onSave with the current name on submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<MemberNameModal isOpen initialName="Alex" chapter={{ id: 'c1' }} onSave={onSave} />)

    const input = screen.getByDisplayValue('Alex')
    await user.clear(input)
    await user.type(input, 'Jordan')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith('Jordan')
  })

  it('shows an error message when onSave fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(<MemberNameModal isOpen initialName="Alex" chapter={{ id: 'c1' }} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  it('shows a cancel button and calls onCancel when requested', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <MemberNameModal isOpen initialName="Alex" chapter={{ id: 'c1' }} onSave={vi.fn()} onCancel={onCancel} showCancel />
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
