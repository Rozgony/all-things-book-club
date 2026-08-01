import { useState } from 'react'
import { ThemeTagInput, type SelectedTheme } from './ThemeTagInput'
import { type Theme } from '../../api/types'

export interface TopicFormData {
	title: string
	description?: string
	url?: string
	themes: SelectedTheme[]
}

interface TopicFormProps {
	chapterThemes: Theme[]
	initialTitle?: string
	initialUrl?: string
	initialDescription?: string
	initialThemes?: SelectedTheme[]
	submitLabel?: string
	pendingLabel?: string
	submitting?: boolean
	onSubmit: (data: TopicFormData) => void | Promise<void>
	onCancel?: () => void
}

export function TopicForm({
	chapterThemes,
	initialTitle = '',
	initialUrl = '',
	initialDescription = '',
	initialThemes = [],
	submitLabel = 'Add',
	pendingLabel,
	submitting = false,
	onSubmit,
	onCancel
}: TopicFormProps) {
	const [title, setTitle] = useState(initialTitle)
	const [url, setUrl] = useState(initialUrl)
	const [description, setDescription] = useState(initialDescription)
	const [themes, setThemes] = useState<SelectedTheme[]>(initialThemes)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!title.trim() || themes.length === 0) return
		await onSubmit({ title: title.trim(), description: description.trim(), url: url.trim(), themes })
		if (!onCancel) {
			setTitle('')
			setDescription('')
			setThemes([])
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-4">
			<input
				type="text"
				maxLength={48}
				value={title}
				required={true}
				onChange={e => setTitle(e.target.value)}
				placeholder="Add a topic…"
				className="px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone text-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
			/>
			<input
				type="url"
				value={url}
				onChange={e => setUrl(e.target.value)}
				placeholder="Add a link (optional)"
				className="px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone text-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
			/>
			<textarea
				value={description}
				onChange={e => setDescription(e.target.value)}
				placeholder="Description (optional)"
				rows={2}
				maxLength={600}
				className="px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone text-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta resize-none"
			/>
			<div className="flex items-end gap-2">
				<ThemeTagInput
					chapterThemes={chapterThemes}
					selectedThemes={themes}
					onChange={setThemes}
					placeholder="Add at least one theme & click enter…"
				/>
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						className="px-3 py-2 border border-warm-border text-stone-muted text-sm rounded hover:bg-cream transition-colors"
					>
						Cancel
					</button>
				)}
				<button
					type="submit"
					disabled={submitting || !title.trim() || themes.length === 0}
					className="px-4 py-2 bg-forest text-white text-sm rounded hover:bg-forest-deep transition-colors disabled:opacity-50"
				>
					{submitting ? (pendingLabel || `${submitLabel}…`) : submitLabel}
				</button>
			</div>
		</form>
	)
}
