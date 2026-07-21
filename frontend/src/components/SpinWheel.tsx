import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { type Topic } from '../api/types'

interface SpinWheelProps {
	topics: Topic[]
	onSpinEnd: (topic: Topic) => void
	spinning: boolean
	onSpinStart: () => void
}

const COLORS = [
	'#C0876F', '#7D9E7A', '#D4A96A', '#8B7355', '#A67C6D',
	'#6B8E7A', '#C4956A', '#7A8E6B', '#B07850', '#8E7A6B',
]

export function SpinWheel({ topics, onSpinEnd, spinning, onSpinStart }: SpinWheelProps) {
	const svgRef = useRef<SVGSVGElement>(null)
	const rotationRef = useRef(0)

	const pendingTopics = topics.filter(t => t.wheelStatus === 'PENDING')
	const size = 400
	const radius = size / 2 - 10
	const cx = size / 2
	const cy = size / 2

	useEffect(() => {
		if (!svgRef.current || pendingTopics.length === 0) return

		const svg = d3.select(svgRef.current)
		svg.selectAll('*').remove()

		const g = svg.append('g').attr('transform', `translate(${cx},${cy})`)
		const pie = d3.pie<Topic>().value(() => 1).sort(null)
		const arc = d3.arc<d3.PieArcDatum<Topic>>().innerRadius(0).outerRadius(radius)

		const arcs = g.selectAll('g.arc')
			.data(pie(pendingTopics))
			.enter().append('g')
			.attr('class', 'arc')

		arcs.append('path')
			.attr('d', arc)
			.attr('fill', (_, i) => COLORS[i % COLORS.length])
			.attr('stroke', 'white')
			.attr('stroke-width', 2)

		arcs.append('text')
			// .attr('rotate', d => {
			// 	console.log({d})
			// 	return `${d.endAngle - d.startAngle}rad`
			// })
			.attr('transform', d => `translate(${arc.centroid(d)})`)
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('fill', 'white')
			.attr('font-size', pendingTopics.length > 6 ? '14' : '16')
			.attr('font-weight', '600')
			.each(function(d) {
				const words = d.data.title.split(' ')
				const text = d3.select(this)
				if (words.length <= 2) {
					text.text(d.data.title)
				} else {
					text.append('tspan').attr('x', 0).attr('dy', '-0.6em').text(words.slice(0, 2).join(' '))
					text.append('tspan').attr('x', 0).attr('dy', '1.2em').text(words.slice(2, 4).join(' '))
				}
			})

	}, [pendingTopics.map(t => t.id).join(',')])

	const handleSpin = () => {
		if (spinning || pendingTopics.length === 0) return
		onSpinStart()

		const spins = 5 + Math.random() * 5
		const extraDeg = Math.random() * 360
		const totalDeg = spins * 360 + extraDeg
		const finalRotation = rotationRef.current + totalDeg
		rotationRef.current = finalRotation % 360

		const wheel = svgRef.current?.querySelector('g')
		if (!wheel) return

		const duration = 4000
		const start = performance.now()
		const startRot = finalRotation - totalDeg

		const animate = (now: number) => {
			const elapsed = now - start
			const progress = Math.min(elapsed / duration, 1)
			// Ease out cubic
			const eased = 1 - Math.pow(1 - progress, 3)
			const current = startRot + totalDeg * eased
			wheel.setAttribute('transform', `translate(${cx},${cy}) rotate(${current})`)

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				// Determine which topic landed at the top (270 degrees = top)
				const normalized = ((rotationRef.current % 360) + 360) % 360
				const anglePerSlice = 360 / pendingTopics.length
				// The top of the wheel is at 270deg (or -90deg). Account for pie starting at right (0deg).
				const pointerAngle = (360 - normalized + 270) % 360
				const index = Math.floor(pointerAngle / anglePerSlice) % pendingTopics.length
				onSpinEnd(pendingTopics[index])
			}
		}
		requestAnimationFrame(animate)
	}

	if (pendingTopics.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center w-full h-64 text-stone-muted">
				<p className="text-lg font-heading">No topics left to spin!</p>
				<p className="text-sm mt-1">Add topics below to get started.</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col items-center gap-4">
			<div className="relative">
				{/* Pointer triangle at top */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
					<div style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '20px solid #C0876F' }} />
				</div>
				<svg ref={svgRef} width={size} height={size} style={{ display: 'block' }} />
			</div>
			<button
				onClick={handleSpin}
				disabled={spinning}
				className="px-8 py-3 bg-terracotta text-white font-heading tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50 text-lg"
			>
				{spinning ? 'Spinning…' : 'Spin!'}
			</button>
		</div>
	)
}
