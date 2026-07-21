interface ConfirmModalProps {
	header: string
	bodyText: React.ReactNode
	confirmText?: string
	cancelText?: string
	onConfirm: () => void
	onCancel: () => void
	confirmColor?: string
	confirming?: boolean
}

export function ConfirmModal({
	header,
	bodyText,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	onConfirm,
	onCancel,
	confirmColor = 'bg-red-600',
	confirming = false,
}: ConfirmModalProps) {
	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded border border-warm-border p-6 max-w-sm w-full" style={{ boxShadow: 'var(--shadow)' }}>
				<h3 className="font-heading text-forest-deep mb-2">{header}</h3>
				<p className="text-sm text-stone-muted mb-5">{bodyText}</p>
				<div className="flex gap-3 justify-end">
					<button
						onClick={onCancel}
						className="px-4 py-2 text-sm text-stone-muted hover:text-stone transition-colors"
					>
						{cancelText}
					</button>
					<button
						onClick={onConfirm}
						disabled={confirming}
						className={`px-4 py-2 ${confirmColor} text-white text-sm rounded transition-colors disabled:opacity-50`}
					>
						{confirming ? `${confirmText}…` : confirmText}
					</button>
				</div>
			</div>
		</div>
	)
}
