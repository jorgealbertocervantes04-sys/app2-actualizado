// Única función serverless de Vercel: delega todo /api/* a la app Hono.
import app from "../server/boot.js";

export default {
  fetch: (request: Request) => app.fetch(request),
};
