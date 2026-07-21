import { SpinnerSize } from "../api/types"

const COLORS = ['#C0876F', '#7D9E7A', '#D4A96A', '#8B7355', '#A67C6D']

const SIZE_LG = 80
const SIZE_SM = 30

export function LoadingSpinner({ size }: { size?: SpinnerSize }) {
	const thisSize = size === SpinnerSize.SM ? SIZE_SM : SIZE_LG
	const CX = thisSize / 2
	const CY = thisSize / 2
	const R = thisSize / 3
	const N = 5

	function slicePath(i: number) {
		const startAngle = -Math.PI / 2 + i * (2 * Math.PI / N)
		const endAngle = -Math.PI / 2 + (i + 1) * (2 * Math.PI / N)
		const x1 = CX + R * Math.cos(startAngle)
		const y1 = CY + R * Math.sin(startAngle)
		const x2 = CX + R * Math.cos(endAngle)
		const y2 = CY + R * Math.sin(endAngle)
		return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`
	}

	return (
		<svg
			width={thisSize}
			height={thisSize}
			viewBox={`0 0 ${thisSize} ${thisSize}`}
			style={{ animation: 'spin 1.4s linear infinite', transformOrigin: 'center', transformBox: 'fill-box' }}
		>
			<style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
			<g transform={`translate(0,0)`}>
				{Array.from({ length: N }, (_, i) => (
					<path
						key={i}
						d={slicePath(i)}
						fill={COLORS[i]}
						stroke="white"
						strokeWidth={2}
					/>
				))}
			</g>
		</svg>
	)
}
