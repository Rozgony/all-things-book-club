import { prisma } from '../lib/prisma'
import { TopicStatus } from '@prisma/client'

export async function createTopic(data: {
	meetingId: string
	title: string
	description?: string
	createdById?: string
}) {
	return prisma.topic.create({
		data: {
			meetingId: data.meetingId,
			title: data.title,
			description: data.description,
			createdById: data.createdById,
		}
	})
}

export async function getTopicsByMeetingId(meetingId: string) {
	return prisma.topic.findMany({
		where: { meetingId },
		orderBy: { createdAt: 'asc' }
	})
}

export async function getTopicById(id: string) {
	return prisma.topic.findUnique({ where: { id } })
}

export async function updateTopicStatus(id: string, wheelStatus: TopicStatus) {
	return prisma.topic.update({
		where: { id },
		data: { wheelStatus }
	})
}

export async function deleteTopic(id: string) {
	return prisma.topic.delete({ where: { id } })
}
