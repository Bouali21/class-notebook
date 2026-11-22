import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as classes from "@/server/classes";
import { aiAvailable } from "@/server/ai";
import { teacherMiddleware } from "./middleware";

const byId = (data: unknown) => classes.idInput.parse(data);

export const getClasses = createServerFn()
  .middleware([teacherMiddleware])
  .handler(({ context }) => classes.listClasses(context.user.id));

export const getClass = createServerFn()
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) => classes.getClass(context.user.id, data.id));

export const createClass = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => classes.classInput.parse(data))
  .handler(({ data, context }) => classes.createClass(context.user.id, data));

export const updateClass = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => classes.updateClassInput.parse(data))
  .handler(({ data, context }) => classes.updateClass(context.user.id, data));

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    classes.deleteClass(context.user.id, data.id),
  );

export const addStudents = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => classes.addStudentsInput.parse(data))
  .handler(({ data, context }) => classes.addStudents(context.user.id, data));

export const renameStudent = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => classes.renameStudentInput.parse(data))
  .handler(({ data, context }) =>
    classes.renameStudent(context.user.id, data),
  );

export const regenerateCode = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    classes.regenerateCode(context.user.id, data.id),
  );

export const removeStudent = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    classes.removeStudent(context.user.id, data.id),
  );

/** Classes for pickers, plus whether AI drafting is on. */
export const getEditorContext = createServerFn()
  .middleware([teacherMiddleware])
  .validator((data: unknown) =>
    z.object({ ai: z.boolean().default(false) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => ({
    classes: (await classes.listClasses(context.user.id)).map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
    })),
    aiEnabled: data.ai ? await aiAvailable() : false,
  }));
