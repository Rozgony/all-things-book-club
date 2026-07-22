import { useState } from 'react'
import { createChapter } from '../api/chapters'
import { VisibilityLevel, visibilityReadable, type Chapter } from '../api/types'

interface CreateChapterFormProps {
	onChapterCreated: (chapter: Chapter) => void
	onCancel: () => void
}

export function CreateChapterForm({ onChapterCreated, onCancel }: CreateChapterFormProps) {
	const [newName, setNewName] = useState('')
	const [editVisibility, setEditVisibility] = useState<VisibilityLevel>(VisibilityLevel.MEMBERS_ONLY)
	const [newDescription, setNewDescription] = useState('')
	const [creating, setCreating] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setCreating(true)
		setFormError(null)
		try {
			const chapter = await createChapter({ name: newName, description: newDescription || undefined, visibility: editVisibility })
			onChapterCreated(chapter)
			setNewName('')
			setNewDescription('')
		} catch {
			setFormError('Failed to create chapter')
		} finally {
			setCreating(false)
		}
	}

	return (
	  	<form onSubmit={handleCreate} className="bg-white rounded border border-warm-border p-6 mb-7 space-y-4" style={{ boxShadow: 'var(--shadow)' }}>
	    	<h3 className="font-heading text-forest-deep">Create a Chapter</h3>
			<div>
				<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Name <span className="text-red-500">*</span></label>
				<input
					type="text"
					value={newName}
					onChange={e => setNewName(e.target.value)}
					required
					className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
				/>
			</div>
	    	<div>
				<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Description</label>
				<textarea
					value={newDescription}
					onChange={e => setNewDescription(e.target.value)}
					rows={3}
					className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
				/>
	    	</div>
			<div>
				<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Visibility</label>
				<select
					value={editVisibility}
					onChange={e => setEditVisibility(e.target.value as VisibilityLevel)}
					className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
				>
					{['ACCEPTING_MEMBERS', 'INVITE_ONLY', 'MEMBERS_ONLY'].map(value => (
						<option key={value} value={value}>{visibilityReadable[value as VisibilityLevel]}</option>
					))}
				</select>
			</div>
	    	{formError && <p className="text-sm text-red-600">{formError}</p>}
			<div className="flex gap-3">
				<button
					type="submit"
					disabled={creating}
					className="px-4 py-2 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-dark transition-colors disabled:opacity-50"
				>
					{creating ? 'Creating…' : 'Create Chapter'}
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="px-4 py-2 text-terracotta hover:text-terracotta-dark border rounded border-terracotta text-sm rounded transition-colors"
				>
					Cancel
				</button>
			</div>
	  	</form>
	)
}
