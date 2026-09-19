import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingInfo } from '../MeetingInfo'
import { MeetingStatus, type Meeting } from '../../../api/types'

const navigateMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    chapterId: 'c1',
    scheduledAt: '2026-10-01T18:00:00.000Z',
    duration: 60,
    status: MeetingStatus.SCHEDULED,
    recurringGroupId: null,
    ...overrides,
  }
}

const baseProps = {
  editingDate: false,
  editDateValue: '',
  videoCallLinkValue: '',
  physicalAddressValue: '',
  savingDate: false,
  savingStatus: false,
  onEditDateStart: vi.fn(),
  onSaveDate: vi.fn(),
  onCancelEdit: vi.fn(),
  onEditDateValueChange: vi.fn(),
  onVideoCallLinkChange: vi.fn(),
  onPhysicalAddressChange: vi.fn(),
  onStatusUpdate: vi.fn(),
  formatDate: (d: string) => `formatted(${d})`,
}

describe('MeetingInfo', () => {
  it('renders the chapter name, formatted date, and status', () => {
    render(<MeetingInfo {...baseProps} meeting={makeMeeting({ chapter: { name: 'Sci-Fi Club' } as never })} />)
    expect(screen.getByText('Sci-Fi Club Chapter')).toBeInTheDocument()
    expect(screen.getByText('formatted(2026-10-01T18:00:00.000Z)')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('navigates back when the chapter link is clicked', async () => {
    const user = userEvent.setup()
    render(<MeetingInfo {...baseProps} meeting={makeMeeting()} />)

    await user.click(screen.getByText(/Chapter$/))
    expect(navigateMock).toHaveBeenCalledWith(-1)
  })

  it('shows "Start Meeting" for a scheduled meeting and "End Meeting" for an active one', () => {
    const { rerender } = render(<MeetingInfo {...baseProps} meeting={makeMeeting({ status: MeetingStatus.SCHEDULED })} />)
    expect(screen.getByRole('button', { name: 'Start Meeting' })).toBeInTheDocument()

    rerender(<MeetingInfo {...baseProps} meeting={makeMeeting({ status: MeetingStatus.ACTIVE })} />)
    expect(screen.getByRole('button', { name: 'End Meeting' })).toBeInTheDocument()
  })

  it('calls onStatusUpdate when the status button is clicked', async () => {
    const onStatusUpdate = vi.fn()
    const user = userEvent.setup()
    render(<MeetingInfo {...baseProps} meeting={makeMeeting()} onStatusUpdate={onStatusUpdate} />)

    await user.click(screen.getByRole('button', { name: 'Start Meeting' }))
    expect(onStatusUpdate).toHaveBeenCalledOnce()
  })

  it('shows an edit-date button only for scheduled/active meetings', () => {
    const { rerender } = render(<MeetingInfo {...baseProps} meeting={makeMeeting({ status: MeetingStatus.COMPLETED })} />)
    expect(screen.queryByTitle('Edit date')).not.toBeInTheDocument()

    rerender(<MeetingInfo {...baseProps} meeting={makeMeeting({ status: MeetingStatus.SCHEDULED })} />)
    expect(screen.getByTitle('Edit date')).toBeInTheDocument()
  })

  it('starts editing when the edit-date button is clicked', async () => {
    const onEditDateStart = vi.fn()
    const user = userEvent.setup()
    render(<MeetingInfo {...baseProps} meeting={makeMeeting()} onEditDateStart={onEditDateStart} />)

    await user.click(screen.getByTitle('Edit date'))
    expect(onEditDateStart).toHaveBeenCalledOnce()
  })

  it('renders an editable form when editingDate is true, wired to the change handlers', async () => {
    const onEditDateValueChange = vi.fn()
    const onSaveDate = vi.fn()
    const onCancelEdit = vi.fn()
    const user = userEvent.setup()
    render(
      <MeetingInfo
        {...baseProps}
        meeting={makeMeeting()}
        editingDate
        editDateValue="2026-10-01T18:00"
        onEditDateValueChange={onEditDateValueChange}
        onSaveDate={onSaveDate}
        onCancelEdit={onCancelEdit}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSaveDate).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancelEdit).toHaveBeenCalledOnce()
  })

  it('shows a saving state and disables the save button while saving', () => {
    render(<MeetingInfo {...baseProps} meeting={makeMeeting()} editingDate savingDate editDateValue="2026-10-01T18:00" />)
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('renders video call and location links when present', () => {
    render(
      <MeetingInfo
        {...baseProps}
        meeting={makeMeeting({ videoCallLink: 'https://meet.example.com/xyz', physicalAddress: '123 Main St' })}
      />
    )
    expect(screen.getByRole('link', { name: 'Open Video Link' })).toHaveAttribute('href', 'https://meet.example.com/xyz')
    expect(screen.getByRole('link', { name: '123 Main St' })).toHaveAttribute(
      'href',
      'https://maps.google.com/?q=123%20Main%20St'
    )
  })
})
