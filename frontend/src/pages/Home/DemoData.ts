import { MeetingStatus, type Meeting, type Topic } from '../../api/types'

export const DEMO_TOPIC_DURATION_MS = 16000
export const DEMO_SPIN_DURATION_MS = 3000
export const DEMO_BUBBLE_MAX_CHARS = 300
export const MODAL_DELAY_MS = 2000

export interface DemoMessage {
	side: 'left' | 'right'
	name: string
	text: string
}

// Fake ACTIVE meeting so the real SpinWheel component can be reused as-is
export const DEMO_MEETING: Meeting = {
	id: 'demo-meeting',
	chapterId: 'demo-chapter',
	scheduledAt: new Date().toISOString(),
	duration: 60,
	status: MeetingStatus.ACTIVE,
	recurringGroupId: null,
}

export const demoTopics: Topic[] = [
	{
		id: 'demo-1',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: new Date().toISOString(),
		title: 'You Can See Everything',
		description: 'That creepy Nathan Felder documentary about Elizabeth Holmes',
	},
	{
		id: 'demo-2',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: new Date().toISOString(),
		title: "The Dawn of Everything",
		description: 'I\'m finally getting around to reading it.',
	},
	{
		id: 'demo-3',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: new Date().toISOString(),
		title: 'Claude Memes',
		description: 'I feel seen.',
	},
	{
		id: 'demo-4',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: new Date().toISOString(),
		title: 'Nations Apart',
		description: 'More people need to read this book.',
	},
	{
		id: 'demo-5',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: new Date().toISOString(),
		title: 'Great British Bake Off',
		description: 'New season!',
	},
	{
		id: 'demo-6',
		chapterId: DEMO_MEETING.chapterId,
		createdById: null,
		status: 'PENDING',
		createdAt: new Date().toISOString(),
		title: 'Join or Die',
		description: 'This Netflix documentary made me re-think a lot of things.',
	},
]


// Two recurring "members" carry every demo conversation, alternating left/right
export const demoConversations: Record<string, DemoMessage[]> = {
	'demo-1': [
		{ side: 'left', name: 'Maya', text: 'Did you see that trailer with her saying "Why would I deceive you?" That was the creepiest thing!' },
		{ side: 'right', name: 'Devon', text: 'Yeah, I know... and his silence in response just added to the creepiness.' },
		{ side: 'left', name: 'Jim', text: 'Completely. People are already making some hilarious memes with it.' },
		{ side: 'right', name: 'Devon', text: 'I\'m sure they are.' },
	],
	'demo-2': [
		{ side: 'left', name: 'Jim', text: "This book really changed how I see history. Previously I assumed history was just a long string of Empires and democracy, with the exception of ancient Athens, was relatively recent. The book proved the opposite: most people did not live in empires until the last couple centuries and there were many forms of democracy in complex societies." },
		{ side: 'right', name: 'Claire', text: 'That completely reframes how I think about progress. I always thought we were getting more democratic, but it sounds like we actually had to fight to get back to what we already knew how to do.' },
		{ side: 'left', name: 'Maya', text: 'Exactly. And the part about how people had agency and made deliberate choices about their social structures? That was on point. We tend to treat hierarchy like it was inevitable.' },
		{ side: 'right', name: 'Devon', text: 'So are you saying we could actually do something different now, or does the book suggest we\'re locked into this model?' },
	],
	'demo-3': [
		{ side: 'left', name: 'Devon', text: 'I love the #ThingsClaudeToldMe memes that have been going around. So hilarious!' },
		{ side: 'right', name: 'Maya', text: 'I know I feel seen.' },
		{ side: 'left', name: 'Jim', text: 'I don\'t understand why people treat Claude or other AIs with such reverence. It\'s just a cool new tool that sometimes works well, sometimes not.' },
		{ side: 'right', name: 'Devon', text: 'Right. I know people who trust Claude more than the humans around them, even if they are experts in their field. It\'s crazy.' },
	],
	'demo-4': [
		{ side: 'left', name: 'Claire', text: "This really changed how I think about the so-called \"culture wars\". Yeah we are all different depending on what part of the country we come from but that doesn't mean we have to fight about it." },
		{ side: 'right', name: 'Devon', text: 'There are a lot of people in Appalachia who love freedom as much as in the northeast, they just speak a different language about it.' },
		{ side: 'left', name: 'Maya', text: 'Yeah, I loved the framing of access to health care not as a human right but rather you can protect your family better if you have healthcare for them. It makes so much sense.' },
		{ side: 'right', name: 'Devon', text: 'People just need to listen to the underlying needs of what others are talking about and not just focus on the specific words they are using.' },
	],
	'demo-5': [
		{ side: 'left', name: 'Devon', text: "I'm excited about the new season of British Bake Off. I'm going to miss Prue though." },
		{ side: 'right', name: 'Claire', text: 'Yeah, she seemed to appreciate the experience still, she\'s just in her 80s and needed a break.' },
		{ side: 'left', name: 'Maya', text: 'It was funny how she talked about spending 10 weeks of the year just eating cake and wine. I can see the pros and cons of that.' },
		{ side: 'right', name: 'Jim', text: 'Yeah, right?' },
	],
	'demo-6': [
		{ side: 'left', name: 'Jim', text: "This documentary was so interesting. It talked about the importance of being part of volunteer community groups like book clubs because of how they're practice grounds for direct democracy." },
		{ side: 'right', name: 'Devon', text: 'Yeah, I saw it too. And not just demcracic practice but building that social capital across class lines.' },
		{ side: 'left', name: 'Maya', text: 'Not just across class lines but also political lines. We\'ve lost the ability to talk to each other.' },
		{ side: 'right', name: 'Devon', text: 'Yeah, that\'s why I started this book club chapter.' },
	],
}
