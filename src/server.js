import "dotenv/config";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { assertAuthConfig } from "./config/auth.js";

// Падаємо на старті, якщо JWT_SECRET не налаштований
assertAuthConfig();

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`Server: http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
