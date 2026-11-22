import { defineEveryApp } from "@every-app/sdk";

export default defineEveryApp({
  id: "class-notebook",
  name: "Class Notebook",
  description:
    "Plan lessons, build worksheets students answer with a class code, and track attendance, marks and family results.",
  icon: "/icon.svg",
  // Every teacher in the organization keeps their own classes; admins also get a read-only overview.
  access: "everyone",
  resources: {
    d1: ["DB"],
  },
  providers: [
    {
      id: "openrouter",
      why: "Drafts lesson plans and worksheet questions from a topic.",
      docs: "https://openrouter.ai/keys",
    },
  ],
  features: {
    "ai-drafting": {
      name: "AI drafting",
      why: "Adds a Draft with AI button to lesson plans and worksheets.",
      providers: ["openrouter"],
    },
  },
  // Students and families have no Gateway account: they reach only these.
  public: [
    // The student page and the calls it makes with a student's access code.
    { path: "/student", methods: ["GET"] },
    { path: "/api/student/*", methods: ["POST"] },
    // A family's results page and its PIN check.
    { path: "/family/:token", methods: ["GET"] },
    { path: "/api/family/:token", methods: ["POST"] },
  ],
  publicAssets: ["/assets/**", "/icon.svg", "/favicon.ico"],
});
