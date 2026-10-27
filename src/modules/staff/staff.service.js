import { staffRepository } from './staff.repository.js';
import { subjectsRepository } from '../subjects/subjects.repository.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../lib/errors.js';
import * as constants from '../../config/constants.js';

// Базова зарплата за замовчуванням
const BASE_SALARY = constants.DEFAULT_SALARY || constants.SALARY || 40000;

export const staffService = {
  async getAll() {
    const items = await staffRepository.findAll();
    return items.map((item) => {
      const subjectIds = item.staffSubjects
        ? item.staffSubjects.map((ss) => ss.subjectId)
        : [];
      return {
        id: item.id,
        group_id: item.groupId,
        ...item.data,
        subjectIds,
      };
    });
  },

  async getById(id) {
    const item = await staffRepository.findById(id);
    if (!item) {
      throw new NotFoundError('Співробітника не знайдено');
    }
    const subjectIds = item.staffSubjects
      ? item.staffSubjects.map((ss) => ss.subjectId)
      : [];
    return {
      id: item.id,
      group_id: item.groupId,
      ...item.data,
      subjectIds,
    };
  },

  async create(body) {
    const { name, position, salary, allowance, groupId, group_id, subjectIds } = body;
    const finalGroupId = group_id || groupId || null;

    if (subjectIds && subjectIds.length > 0) {
      for (const subId of subjectIds) {
        const subExists = await subjectsRepository.findById(subId);
        if (!subExists) {
          throw new BadRequestError(`Гурток з ID ${subId} не знайдено`);
        }
      }
    }

    const staffData = {
      name: name.trim(),
      position,
      salary: salary !== undefined ? salary : BASE_SALARY,
      allowance: allowance !== undefined ? allowance : 0,
    };

    const created = await staffRepository.create(staffData, finalGroupId);

    if (subjectIds && subjectIds.length > 0) {
      await staffRepository.setStaffSubjects(created.id, subjectIds);
    }

    return this.getById(created.id);
  },

  async update(id, body) {
    const existing = await staffRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Співробітника не знайдено');
    }

    const { name, position, salary, allowance, groupId, group_id, subjectIds } = body;
    const finalGroupId = group_id !== undefined ? group_id : groupId;

    if (subjectIds && subjectIds.length > 0) {
      for (const subId of subjectIds) {
        const subExists = await subjectsRepository.findById(subId);
        if (!subExists) {
          throw new BadRequestError(`Гурток з ID ${subId} не знайдено`);
        }
      }
    }

    const updatedStaffData = {
      ...existing.data,
      ...(name !== undefined && { name: name.trim() }),
      ...(position !== undefined && { position }),
      ...(salary !== undefined && { salary }),
      ...(allowance !== undefined && { allowance }),
    };

    const resolvedGroupId = finalGroupId !== undefined ? finalGroupId : existing.group_id;
    await staffRepository.update(id, updatedStaffData, resolvedGroupId);

    if (subjectIds !== undefined) {
      await staffRepository.setStaffSubjects(id, subjectIds);
    }

    return this.getById(id);
  },

  async delete(id) {
    const existing = await staffRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Співробітника не знайдено');
    }

    try {
      await staffRepository.delete(id);
    } catch (error) {
      if (error.code === 'P2003') {
        throw new ConflictError(
          'Не можна видалити співробітника, до якого прив’язані пов’язані записи',
        );
      }
      throw error;
    }

    return { message: 'Співробітника видалено' };
  },
};