export const staffDocs = {
  '/staff': {
    get: { summary: 'Отримати список співробітників' },
    post: { summary: 'Створити нового співробітника' },
  },
  '/staff/{id}': {
    get: { summary: 'Отримати співробітника за ID' },
    patch: { summary: 'Оновити співробітника за ID' },
  },
};

export default staffDocs;