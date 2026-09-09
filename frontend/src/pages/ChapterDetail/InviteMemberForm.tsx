import { useState } from 'react'
import { InviteModal } from '../../components/InviteModal'

interface InviteMemberFormProps {
	chapterId: string
}

export function InviteMemberForm({ chapterId }: InviteMemberFormProps) {
	const [open, setOpen] = useState(false)

	return (
		<div>
			<button
				onClick={() => setOpen(true)}
				className="px-3 py-1 text-sm border border-warm-border rounded hover:bg-cream transition-colors"
			>
				+ Invite a member
			</button>
			{open && <InviteModal chapterId={chapterId} onClose={() => setOpen(false)} />}
		</div>
	)
}
