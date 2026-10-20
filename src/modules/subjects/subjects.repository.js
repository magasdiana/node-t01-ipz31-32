import { prisma } from '../../lib/prisma.js';

export const subjectsRepository = {
  async findAll() {
    return prisma.subject.findMany();
  },

  async findById(id) {
    return prisma.subject.findUnique({
      where: { id: Number(id) },
    });
  },

  async create(data) {
    return prisma.subject.create({
      data: { data },
    });
  },

  async update(id, data) {
    return prisma.subject.update({
      where: { id: Number(id) },
      data: { data },
    });
  },
};
