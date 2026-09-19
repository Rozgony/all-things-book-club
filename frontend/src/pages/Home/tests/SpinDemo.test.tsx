import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { LoginSpinDemo } from '../SpinDemo'
import { demoTopics } from '../DemoData'
import type { Topic } from '../../../api/types'

vi.mock('../../Meetings/SpinWheel', () => ({
  SpinWheel: ({ onSpinEnd }: { onSpinEnd: (topic: Topic) => void }) => (
    <div data-testid="spin-wheel">
      <button onClick={() => onSpinEnd(demoTopics[0])}>Trigger spin end</button>
    </div>
  ),
}))

describe('LoginSpinDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the demo spin wheel', () => {
    render(<LoginSpinDemo />)
    expect(screen.getByTestId('spin-wheel')).toBeInTheDocument()
  })

  it('shows the selected topic after a spin ends', () => {
    render(<LoginSpinDemo />)

    fireEvent.click(screen.getByRole('button', { name: 'Trigger spin end' }))

    expect(screen.getByText('You Can See Everything')).toBeInTheDocument()
    expect(screen.getByText(/Elizabeth Holmes/)).toBeInTheDocument()
  })

  it('progressively reveals conversation messages after a spin', () => {
    render(<LoginSpinDemo />)

    fireEvent.click(screen.getByRole('button', { name: 'Trigger spin end' }))
    expect(screen.queryByText('Maya')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByText('Maya')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2600))
    expect(screen.getByText('Devon')).toBeInTheDocument()
  })
})
