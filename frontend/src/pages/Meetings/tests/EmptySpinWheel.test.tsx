import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptySpinWheel } from '../EmptySpinWheel'

describe('EmptySpinWheel', () => {
  it('shows a "no topics yet" message when there are no topics at all', () => {
    render(<EmptySpinWheel topics={[]} wheelSize={300} />)
    expect(screen.getByText('No topics yet')).toBeInTheDocument()
    expect(screen.getByText('Add topics below to get started.')).toBeInTheDocument()
  })

  it('shows a "no topics left" message when all topics have been discussed', () => {
    render(<EmptySpinWheel topics={[{ id: '1' }]} wheelSize={300} />)
    expect(screen.getByText('No topics left!')).toBeInTheDocument()
    expect(screen.getByText('All topics have been discussed.')).toBeInTheDocument()
  })

  it('renders a disabled spin button', () => {
    render(<EmptySpinWheel topics={[]} wheelSize={300} />)
    expect(screen.getByRole('button', { name: 'Spin!' })).toBeDisabled()
  })
})
