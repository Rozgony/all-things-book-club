interface EmptySpinWheelProps {
	topics: any[]
	wheelSize: number
}

export function EmptySpinWheel({ topics, wheelSize }: EmptySpinWheelProps) {
	const size = 600
	const radius = size / 2 - 10
	const cx = size / 2
	const cy = size / 2

	return (
		<div className="gap-4">
			<button
				disabled
				className="px-4 py-2 bg-forest text-white font-heading tracking-wide rounded opacity-50 text-lg absolute z-50 cursor-not-allowed"
			>
				Spin!
			</button>
			<div className="relative flex flex-col items-center">
				<div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-10">
					<div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '20px solid #C0876F' }} />
				</div>
				<svg viewBox={`0 0 ${size} ${size}`} width={wheelSize} height={wheelSize} style={{ display: 'block' }}>
					<circle cx={cx} cy={cy} r={radius} fill="#e5e0d8" stroke="white" strokeWidth={2} />
					<text x={cx} y={cy - 16} textAnchor="middle" fill="#9c8f85" fontSize="22" fontWeight="600">
						{ topics.length !== 0 ? 'No topics left!' : 'No topics yet' }
					</text>
					<text x={cx} y={cy + 16} textAnchor="middle" fill="#9c8f85" fontSize="14">
						{ topics.length !== 0 ? 'All topics have been discussed.' : 'Add topics below to get started.' }
					</text>
				</svg>
			</div>
		</div>
	)
}
