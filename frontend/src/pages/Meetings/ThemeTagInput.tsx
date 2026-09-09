import { useState } from 'react'
import { type Theme } from '../../api/types'

export interface SelectedTheme {
	id?: string
	name: string
}

interface ThemeTagInputProps {
	chapterThemes: Theme[]
	selectedThemes: SelectedTheme[]
	onChange: (themes: SelectedTheme[]) => void
	placeholder?: string
}

export function ThemeTagInput({ chapterThemes, selectedThemes, onChange, placeholder }: ThemeTagInputProps) {
	const [inputValue, setInputValue] = useState('')
	const [showSuggestions, setShowSuggestions] = useState(false)

	const normalizedSelected = new Set(selectedThemes.map(t => t.name.toLowerCase()))

	const suggestions = inputValue.trim()
		? chapterThemes.filter(t =>
			t.name.toLowerCase().includes(inputValue.trim().toLowerCase()) &&
			!normalizedSelected.has(t.name.toLowerCase())
		).slice(0, 6)
		: []

	const addTheme = (theme: SelectedTheme) => {
		const name = theme.name.trim()
		if (!name || normalizedSelected.has(name.toLowerCase())) return
		onChange([...selectedThemes, { ...theme, name }])
		setInputValue('')
		setShowSuggestions(false)
	}

	const removeTheme = (name: string) => {
		onChange(selectedThemes.filter(t => t.name !== name))
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault()
			if (inputValue.trim()) addTheme({ name: inputValue.trim() })
		} else if (e.key === 'Tab' && suggestions.length > 0) {
			e.preventDefault()
			addTheme({ id: suggestions[0].id, name: suggestions[0].name })
		} else if (e.key === 'Backspace' && !inputValue && selectedThemes.length > 0) {
			removeTheme(selectedThemes[selectedThemes.length - 1].name)
		}
	}

	return (
		<div className="relative flex-1 min-w-40">
			<div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-warm-border rounded bg-cream/40 focus-within:ring-2 focus-within:ring-terracotta focus-within:border-terracotta">
				{selectedThemes.map(theme => (
					<span
						key={theme.name}
						className="inline-flex items-center gap-1 px-2 py-0.5 bg-forest/10 text-forest-deep text-xs rounded-full"
					>
						#{theme.name}
						<button
							type="button"
							onClick={() => removeTheme(theme.name)}
							className="text-forest-deep/60 hover:text-forest-deep"
						>
							×
						</button>
					</span>
				))}
				<input
					type="text"
					value={inputValue}
					onChange={e => { setInputValue(e.target.value); setShowSuggestions(true) }}
					onFocus={() => setShowSuggestions(true)}
					onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
					onKeyDown={handleKeyDown}
					style={{outline: 'none'}}
					placeholder={selectedThemes.length === 0 ? (placeholder || 'Add themes & click enter…') : ''}
					className="flex-1 min-w-20 bg-transparent text-sm text-stone py-0.5 focus:outline-none focus:ring-0 border-0"
				/>
			</div>
			{showSuggestions && suggestions.length > 0 && (
				<ul className="absolute z-10 mt-1 w-full bg-white border border-warm-border rounded shadow-md max-h-40 overflow-auto">
					{suggestions.map(theme => (
						<li key={theme.id}>
							<button
								type="button"
								onClick={() => addTheme({ id: theme.id, name: theme.name })}
								className="w-full text-left px-3 py-1.5 text-sm text-stone hover:bg-cream transition-colors"
							>
								#{theme.name}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
