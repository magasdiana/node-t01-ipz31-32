// Ролі системи (README, розділ 3). Значення в нижньому регістрі зберігаються
// в users.data.role і потрапляють у JWT. Богдан і Денис беруть ролі звідси,
// щоб не писати рядки вручну.
export const ROLES = Object.freeze({
  ADMIN: "admin",
  MANAGER: "manager",
  PARENT: "parent",
  TEACHER: "teacher",
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const isRole = (value) => ROLE_VALUES.includes(value);
