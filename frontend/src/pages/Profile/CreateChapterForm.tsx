import { useState } from 'react'
import { createChapter } from '../../api/chapters'
import { type Chapter } from '../../api/types'
import { useAuthStore } from '../../store/authStore'

interface CreateChapterFormProps {
	onChapterCreated: (chapter: Chapter) => void
	onCancel: () => void
}

export function CreateChapterForm({ onChapterCreated, onCancel }: CreateChapterFormProps) {
	const [newName, setNewName] = useState('')
	const [newDescription, setNewDescription] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [creating, setCreating] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)
	const user = useAuthStore((s) => s.user)

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setCreating(true)
		setFormError(null)
		try {
			const chapter = await createChapter({ 
				name: newName, 
				description: newDescription || undefined, 
				creatorName: displayName || user?.user_metadata.full_name || user?.email || 'Unknown',
			})
			onChapterCreated(chapter)
			setNewName('')
			setNewDescription('')
			setDisplayName('')
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
				<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Your display name in this chapter</label>
				<input
					type="text"
					value={displayName}
					onChange={e => setDisplayName(e.target.value)}
					placeholder="How members will see you"
					className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
				/>
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
