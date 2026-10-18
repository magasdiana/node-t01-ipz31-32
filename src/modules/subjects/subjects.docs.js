export const subjectsDocs = {
  '/subjects': {
    get: { summary: 'Отримати список гуртків' },
    post: { summary: 'Створити новий гурток' },
  },
  '/subjects/{id}': {
    get: { summary: 'Отримати гурток за ID' },
    patch: { summary: 'Оновити гурток за ID' },
  },
};

export default subjectsDocs;