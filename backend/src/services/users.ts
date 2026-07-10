import { prisma } from '../lib/prisma'

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function updateUser(id: string, data: { name?: string; avatarUrl?: string; timezone?: string }) {
  return prisma.user.update({ where: { id }, data })
}
