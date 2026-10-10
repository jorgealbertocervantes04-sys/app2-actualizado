import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  adminCsv,
  adminCsvDetail,
  adminDetail,
  adminListSessions,
  assertAdmin,
  completeSession,
  getResult,
  getSessionState,
  saveActivity,
  startOrResume,
} from "./queries/evaluations";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  eval: createRouter({
    start: publicQuery
      .input(
        z.object({
          name: z.string().min(3),
          employeeNo: z.string().min(1),
          base: z.string().default(""),
        })
      )
      .mutation(({ input }) => startOrResume(input)),

    session: publicQuery
      .input(z.object({ sessionId: z.number() }))
      .query(({ input }) => getSessionState(input.sessionId)),

    decide: publicQuery
      .input(
        z.object({
          sessionId: z.number(),
          scenarioId: z.string(),
          optionId: z.string(),
        })
      )
      .mutation(() => ({ ok: true as const })),

    submit: publicQuery
      .input(
        z.object({
          sessionId: z.number(),
          scenarioId: z.string(),
          payload: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(({ input }) => saveActivity(input)),

    complete: publicQuery
      .input(z.object({ sessionId: z.number() }))
      .mutation(({ input }) => completeSession(input.sessionId)),

    result: publicQuery
      .input(z.object({ sessionId: z.number() }))
      .query(({ input }) => getResult(input.sessionId)),
  }),

  admin: createRouter({
    login: publicQuery
      .input(z.object({ code: z.string() }))
      .mutation(({ input }) => {
        assertAdmin(input.code);
        return { ok: true as const };
      }),

    list: publicQuery
      .input(z.object({ code: z.string() }))
      .query(({ input }) => {
        assertAdmin(input.code);
        return adminListSessions();
      }),

    detail: publicQuery
      .input(z.object({ code: z.string(), sessionId: z.number() }))
      .query(({ input }) => {
        assertAdmin(input.code);
        return adminDetail(input.sessionId);
      }),

    csv: publicQuery
      .input(z.object({ code: z.string() }))
      .query(({ input }) => {
        assertAdmin(input.code);
        return adminCsv();
      }),

    csvDetail: publicQuery
      .input(z.object({ code: z.string(), sessionId: z.number() }))
      .query(({ input }) => {
        assertAdmin(input.code);
        return adminCsvDetail(input.sessionId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
