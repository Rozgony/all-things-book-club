import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeTagInput } from '../ThemeTagInput'
import type { Theme } from '../../../api/types'

const chapterThemes: Theme[] = [
  { id: 't1', chapterId: 'c1', name: 'Sci-Fi', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 't2', chapterId: 'c1', name: 'Science', createdAt: '2026-01-01T00:00:00.000Z' },
]

describe('ThemeTagInput', () => {
  it('renders selected themes as tags', () => {
    render(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[{ id: 't1', name: 'Sci-Fi' }]} onChange={vi.fn()} />)
    expect(screen.getByText('#Sci-Fi')).toBeInTheDocument()
  })

  it('shows the placeholder only when there are no selected themes', () => {
    const { rerender } = render(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[]} onChange={vi.fn()} placeholder="Pick a theme" />)
    expect(screen.getByPlaceholderText('Pick a theme')).toBeInTheDocument()

    rerender(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[{ name: 'Sci-Fi' }]} onChange={vi.fn()} placeholder="Pick a theme" />)
    expect(screen.queryByPlaceholderText('Pick a theme')).not.toBeInTheDocument()
  })

  it('adds a theme when Enter is pressed', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[]} onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'Mystery{Enter}')
    expect(onChange).toHaveBeenCalledWith([{ name: 'Mystery' }])
  })

  it('shows matching suggestions while typing', async () => {
    const user = userEvent.setup()
    render(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[]} onChange={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), 'sci')
    expect(await screen.findByRole('button', { name: '#Sci-Fi' })).toBeInTheDocument()
  })

  it('adds the first matching suggestion when Tab is pressed', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[]} onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'sci')
    await user.tab()

    expect(onChange).toHaveBeenCalledWith([{ id: 't1', name: 'Sci-Fi' }])
  })

  it('removes a theme when its × button is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[{ id: 't1', name: 'Sci-Fi' }]} onChange={onChange} />)

    await user.click(screen.getByText('×'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('removes the last theme on Backspace when the input is empty', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[{ id: 't1', name: 'Sci-Fi' }]} onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), '{Backspace}')
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('does not add a duplicate theme (case-insensitive)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ThemeTagInput chapterThemes={chapterThemes} selectedThemes={[{ id: 't1', name: 'Sci-Fi' }]} onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'sci-fi{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })
})
