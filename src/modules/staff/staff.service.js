import { staffRepository } from './staff.repository.js';
import { subjectsRepository } from '../subjects/subjects.repository.js';
import * as constants from '../../config/constants.js';

// Базова зарплата за замовчуванням (40000 за ТЗ)
const BASE_SALARY = constants.DEFAULT_SALARY || constants.SALARY || 40000;

export const staffService = {
  async getAll() {
    const items = await staffRepository.findAll();
    return items.map((item) => {
      const subjectIds = item.staff_subjects
        ? item.staff_subjects.map((ss) => ss.subject_id)
        : [];
      return {
        id: item.id,
        group_id: item.group_id,
        ...item.data,
        subjectIds,
      };
    });
  },

  async getById(id) {
    const item = await staffRepository.findById(id);
    if (!item) {
      const error = new Error('Співробітника не знайдено');
      error.status = 404;
      throw error;
    }
    const subjectIds = item.staff_subjects
      ? item.staff_subjects.map((ss) => ss.subject_id)
      : [];
    return {
      id: item.id,
      group_id: item.group_id,
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
          const error = new Error(`Гурток з ID ${subId} не знайдено`);
          error.status = 400;
          throw error;
        }
      }
    }

    const staffData = {
      name,
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
      const error = new Error('Співробітника не знайдено');
      error.status = 404;
      throw error;
    }

    const { name, position, salary, allowance, groupId, group_id, subjectIds } = body;
    const finalGroupId = group_id !== undefined ? group_id : groupId;

    if (subjectIds && subjectIds.length > 0) {
      for (const subId of subjectIds) {
        const subExists = await subjectsRepository.findById(subId);
        if (!subExists) {
          const error = new Error(`Гурток з ID ${subId} не знайдено`);
          error.status = 400;
          throw error;
        }
      }
    }

    const updatedStaffData = {
      ...existing.data,
      ...(name !== undefined && { name }),
      ...(position !== undefined && { position }),
      ...(salary !== undefined && { salary }),
      ...(allowance !== undefined && { allowance }),
    };

    await staffRepository.update(id, updatedStaffData, finalGroupId);

    if (subjectIds !== undefined) {
      await staffRepository.setStaffSubjects(id, subjectIds);
    }

    return this.getById(id);
  },
};