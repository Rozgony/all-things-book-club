import { prisma } from '../lib/prisma'

/**
 * Create a new chapter
 */
export async function createChapter(
	creatorId: string,
	data: { name: string; description?: string, visibility?: string }
) {
	return prisma.chapter.create({
	  data: {
	    name: data.name,
	    description: data.description,
	    creatorId,
		visibility: data.visibility,
	    members: {
	      create: {
	        userId: creatorId,
	        role: 'ADMIN',
	      },
	    },
	  },
	  include: {
	    members: true,
	  },
	})
}

/**
 * Get a charter by Id
 */
export async function getChapterById(
	id: string,
	includeUsers?: boolean
) {
	return prisma.chapter.findUnique({
	  where: { id },
	  include: {
	    members: {
	      include: {
	        user: !!includeUsers
	      }
	    }
	  },
	})
}

/**
 * Get all of the Chapters that a User belongs to
 */
export async function getChaptersByUserId(
	userId: string
) {
	return prisma.chapter.findMany({
	  where: { 
	      members: {
	          some: {
	              userId
	          },
	      }
	  },
	  include: {
	    members: {
			include: {
	        	user: true
	      	}
		}
	  },
	})
}


export type UpdateChapterData = {
	name?: string
	description?: string
	visibility?: string
}

/**
 * Update the name or description of a Chapter
 */
export async function updateChapter(
	id: string,
	chapterData: UpdateChapterData
) {
	return prisma.chapter.update({
	  where: { id },
	  data: {
	    ...chapterData
	  },
	  include: { members: true },
	})
}

/**
 * Delete a Chapter
 */
export async function deleteChapter(
	id: string,
) {
	return prisma.chapter.delete({
	  where: { id },
	})
}

/** TODO 
 * Add a User to a Chapter (creates a ChapterMember Junction Object)
 * Remove a User to a Chapter
 * Creates an Invitation for a Chapter
 * Finds all the Invitations of an Email address
 * Logic of Accepting a Chapter Invite
 * Logic of Rejecting a Chapter Invite
 * List pending invites for a chapter
 */