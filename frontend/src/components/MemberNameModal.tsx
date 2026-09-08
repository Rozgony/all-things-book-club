import { useState, useEffect } from 'react'
import { decrypt } from '../lib/crypto'
import { getChapterKey } from '../lib/keyStore'
import type { Chapter } from '../api/types'

interface MemberNameModalProps {
	isOpen: boolean
	initialName: string
	memberEncryptedBlob?: string | null
	memberNonce?: string | null
	chapter: Partial<Chapter>
	onSave: (name: string) => Promise<void>
	onCancel?: () => void
	showCancel?: boolean
}

export function MemberNameModal({
	isOpen,
	initialName,
	memberEncryptedBlob,
	memberNonce,
	chapter,
	onSave,
	onCancel,
	showCancel = false,
}: MemberNameModalProps) {
	const [name, setName] = useState(initialName)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!isOpen) return
		if (!memberEncryptedBlob || !memberNonce) {
			setName(initialName)
			return
		}
		
		const loadEncryptedName = async () => {
			try {
				const chapterKey = getChapterKey(chapter.id)
				if (!chapterKey) throw new Error('Chapter key not available')
				const decrypted = await decrypt<{ name: string }>(memberEncryptedBlob, memberNonce, chapterKey)
				setName(decrypted.name || initialName)
			} catch (err) {
				console.error('Failed to decrypt member name:', err)
				setName(initialName)
			}
		}
		
		loadEncryptedName()
	}, [isOpen, memberEncryptedBlob, memberNonce, chapter.id, initialName])

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setLoading(true)
		try {
			await onSave(name)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save name')
			setLoading(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-lg p-6 w-96 max-w-full mx-4">
				<h2 className="font-heading text-forest-deep mb-4">Your name in {chapter.name || 'this chapter'}</h2>
				<form onSubmit={handleSave} className="space-y-4">
					<div>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter your name"
							className="w-full px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
							autoFocus
						/>
					</div>
					{error && <p className="text-sm text-red-600">{error}</p>}
					<div className="flex gap-2 justify-end">
						{showCancel && (
							<button
								type="button"
								onClick={onCancel}
								disabled={loading}
								className="px-4 py-2 bg-white text-terracotta border border-terracotta text-sm rounded hover:bg-stone-muted-dark transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
						)}
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-forest text-white text-sm rounded hover:bg-forest-deep transition-colors disabled:opacity-50"
						>
							{loading ? 'Saving…' : 'Save'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
