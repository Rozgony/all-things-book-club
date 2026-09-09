import { type Chapter } from '../../api/types'

interface ChapterHeaderProps {
	chapter: Partial<Chapter>
	editing: boolean
	editName: string
	editDescription: string
	editError: string | null
	saving: boolean
	deleting: boolean
	isAdmin: boolean
	onEdit: () => void
	onEditNameChange: (value: string) => void
	onEditDescriptionChange: (value: string) => void
	onSave: (e: React.FormEvent) => void
	onCancel: () => void
}

export function ChapterHeader({
	chapter,
	editing,
	editName,
	editDescription,
	editError,
	saving,
	isAdmin,
	onEdit,
	onEditNameChange,
	onEditDescriptionChange,
	onSave,
	onCancel,
}: ChapterHeaderProps) {
	if (editing) {
		return (
			<form onSubmit={onSave} className="bg-white rounded border border-warm-border p-6 space-y-4 mb-7" style={{ boxShadow: 'var(--shadow)' }}>
				<h2 className="font-heading text-forest-deep">Edit Chapter</h2>
				<div>
					<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Name <span className="text-red-500">*</span></label>
					<input
						type="text"
						value={editName}
						onChange={e => onEditNameChange(e.target.value)}
						required
						className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
					/>
				</div>
				<div>
					<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Description</label>
					<textarea
						value={editDescription}
						onChange={e => onEditDescriptionChange(e.target.value)}
						rows={3}
						className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
					/>
				</div>
				{editError && <p className="text-sm text-red-600">{editError}</p>}
				<div className="flex gap-3">
					<button
						type="submit"
						disabled={saving}
						className="px-4 py-2 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-deep transition-colors disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
					<button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-terracotta hover:text-terracotta-dark border rounded border-terracotta transition-colors">
						Cancel
					</button>
				</div>
			</form>
		)
	}

	return (
		<div className="bg-white rounded border border-warm-border p-6 mb-7" style={{ boxShadow: 'var(--shadow)' }}>
			<div className="flex justify-between items-start">
				<div>
					<h2 className="font-heading text-forest-deep">{chapter.name}</h2>
					{chapter.description && (
						<p className="text-stone-muted mt-2">{chapter.description}</p>
					)}
				</div>
				{isAdmin && (
					<div className="flex gap-2 ml-4">
						<button
							onClick={onEdit}
							className="px-3 py-1 text-sm border border-warm-border rounded hover:bg-cream transition-colors"
						>
							Edit
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
