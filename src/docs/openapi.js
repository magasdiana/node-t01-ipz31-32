import childrenDocs from "../modules/children/children.docs.js";
import groupsDocs from "../modules/groups/groups.docs.js";
import roomsDocs from "../modules/rooms/rooms.docs.js";
import staffDocs from "../modules/staff/staff.docs.js";
import subjectsDocs from "../modules/subjects/subjects.docs.js";
import lessonsDocs from "../modules/lessons/lessons.docs.js";
import schedulesDocs from "../modules/schedules/schedules.docs.js";
import paymentsDocs from "../modules/payments/payments.docs.js";
import reportsDocs from "../modules/reports/reports.docs.js";
import pricingDocs from "../modules/pricing/pricing.docs.js";

const modules = [
  childrenDocs,
  groupsDocs,
  staffDocs,
  subjectsDocs,
  lessonsDocs,
  schedulesDocs,
  paymentsDocs,
  reportsDocs,
  roomsDocs,
  pricingDocs,
];

// Збираємо шляхи з усіх модулів в одну специфікацію OpenAPI 3
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Garden API",
    version: "0.1.0",
    description: "REST API садка. Авторизації немає, усі ендпоінти відкриті.",
  },
  paths: Object.assign({}, ...modules.map((m) => m.paths)),
};
