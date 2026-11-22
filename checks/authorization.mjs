// Who may reach what: members only on private pages, students and families
// only through their code, link and PIN, teachers only their own records.
import { createHash } from "node:crypto";
import { startRuntime, expect } from "/home/user/oss-new/control/runtime/index.mjs";

const runtime = await startRuntime();
const json = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const pinHash = (token, pin) => createHash("sha256").update(`${token}:${pin}`).digest("hex");
const ids = {
  c1: "11111111-1111-4111-8111-111111111111",
  c2: "22222222-2222-4222-8222-222222222222",
  s1: "33333333-3333-4333-8333-333333333331",
  s1b: "33333333-3333-4333-8333-333333333332",
  s2: "33333333-3333-4333-8333-333333333333",
  p1: "44444444-4444-4444-8444-444444444444",
  w1: "55555555-5555-4555-8555-555555555551",
  w2: "55555555-5555-4555-8555-555555555552",
  w3: "55555555-5555-4555-8555-555555555553",
  a1: "66666666-6666-4666-8666-666666666666",
};
const q = (id, expected) =>
  JSON.stringify([
    { id, kind: "short", prompt: "Name the process", points: 1, choices: [], correctChoice: null, expectedAnswer: expected },
  ]);
try {
  const db = await runtime.database();
  await db.batch([
    db.prepare("insert into classes (id, owner_id, name) values (?, 'owner', 'Owner Algebra Group')").bind(ids.c1),
    db.prepare("insert into classes (id, owner_id, name) values (?, 'member', 'Member History Set')").bind(ids.c2),
    db.prepare("insert into students (id, owner_id, class_id, name, access_code) values (?, 'owner', ?, 'Ada Owner-Pupil', 'KQWX7P')").bind(ids.s1, ids.c1),
    db.prepare("insert into students (id, owner_id, class_id, name, access_code) values (?, 'owner', ?, 'Ben Second-Pupil', 'KQWX8P')").bind(ids.s1b, ids.c1),
    db.prepare("insert into students (id, owner_id, class_id, name, access_code) values (?, 'member', ?, 'Cleo Member-Pupil', 'MBRZ42')").bind(ids.s2, ids.c2),
    db.prepare("insert into lesson_plans (id, owner_id, class_id, date, topic) values (?, 'owner', ?, '2026-11-23', 'Owner secret topic')").bind(ids.p1, ids.c1),
    db.prepare("insert into worksheets (id, owner_id, class_id, title, status, questions) values (?, 'owner', ?, 'Published owner sheet', 'published', ?)").bind(ids.w1, ids.c1, q("q1", "Photosynthesis")),
    db.prepare("insert into worksheets (id, owner_id, class_id, title, status, questions) values (?, 'owner', ?, 'Draft owner sheet', 'draft', ?)").bind(ids.w2, ids.c1, q("q2", "Respiration")),
    db.prepare("insert into worksheets (id, owner_id, class_id, title, status, questions) values (?, 'member', ?, 'Member class sheet', 'published', ?)").bind(ids.w3, ids.c2, q("q3", "Evaporation")),
    db.prepare("insert into assessments (id, class_id, title, date, max_score) values (?, ?, 'Owner test', '2026-11-20', 10)").bind(ids.a1, ids.c1),
    db.prepare("insert into marks (id, assessment_id, student_id, score) values ('m1', ?, ?, 7)").bind(ids.a1, ids.s1),
    db.prepare("insert into family_links (student_id, token, pin_hash) values (?, 'tok-ada-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', ?)").bind(ids.s1, pinHash("tok-ada-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "482913")),
    db.prepare("insert into family_links (student_id, token, pin_hash) values (?, 'tok-ben-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', ?)").bind(ids.s1b, pinHash("tok-ben-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "175320")),
  ]);

  // Anonymous and outsider are refused on member pages.
  await runtime.assertPrivateAccess(["/", "/plans", "/worksheets", "/plans/new"]);
  for (const path of [`/classes/${ids.c1}`, `/students/${ids.s1}`, `/worksheets/${ids.w1}/results`, "/admin"]) {
    for (const role of [undefined, "outsider"]) {
      const res = await runtime.fetch(path, role ? { role } : {});
      expect(res.status, `${role ?? "anonymous"} ${path}`).not.toBe(200);
    }
  }

  // No sign-in page of the app's own.
  for (const path of ["/login", "/signin", "/signup", "/register"]) {
    const res = await runtime.fetch(path, { role: "member" });
    expect(await res.text()).not.toContain('type="password"');
    const anon = await runtime.fetch(path);
    expect(anon.status).not.toBe(200);
  }

  // Public student routes: only the student's own class, published sheets, no answers.
  const page = await runtime.fetch("/student");
  expect(page.status).toBe(200);
  const pageText = await page.text();
  expect(pageText).not.toContain("Ada Owner-Pupil");
  expect(pageText).not.toContain('type="password"');
  expect((await runtime.fetch("/api/student/session", json({ code: "NOPE99" }))).status).toBe(404);
  const session = await runtime.fetch("/api/student/session", json({ code: "kqwx7p" }));
  expect(session.status).toBe(200);
  const sessionText = await session.text();
  expect(sessionText).toContain("Published owner sheet");
  expect(sessionText).not.toContain("Draft owner sheet");
  expect(sessionText).not.toContain("Member class sheet");
  expect(sessionText).not.toContain("Ben Second-Pupil");
  for (const worksheetId of [ids.w2, ids.w3]) {
    const res = await runtime.fetch("/api/student/worksheet", json({ code: "KQWX7P", worksheetId }));
    expect(res.status, worksheetId).toBe(404);
    const sub = await runtime.fetch("/api/student/submit", json({ code: "KQWX7P", worksheetId, answers: {} }));
    expect(sub.status, worksheetId).toBe(404);
  }
  const sheet = await runtime.fetch("/api/student/worksheet", json({ code: "KQWX7P", worksheetId: ids.w1 }));
  expect(sheet.status).toBe(200);
  expect(await sheet.text()).not.toContain("Photosynthesis");

  // Family link: token and PIN both needed; wrong PINs lock it; only that student.
  expect((await runtime.fetch("/api/family/tok-unknown-cccccccccccccccccccccccccccccccc", json({ pin: "482913" }))).status).toBe(404);
  expect((await runtime.fetch("/api/family/tok-ada-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", json({ pin: "000000" }))).status).toBe(401);
  const fam = await runtime.fetch("/api/family/tok-ada-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", json({ pin: "482913" }));
  expect(fam.status).toBe(200);
  const famText = await fam.text();
  expect(famText).toContain("Ada Owner-Pupil");
  expect(famText).toContain("Owner test");
  expect(famText).not.toContain("Ben Second-Pupil");
  for (let i = 0; i < 5; i++) {
    await runtime.fetch("/api/family/tok-ben-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", json({ pin: "999999" }));
  }
  expect((await runtime.fetch("/api/family/tok-ben-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", json({ pin: "175320" }))).status).toBe(429);

  // One teacher never sees another's records.
  const member = await (await runtime.context("member")).newPage();
  await member.goto("/");
  await expect(member.getByRole("link", { name: "Member History Set" })).toBeVisible();
  await expect(member.getByText("Owner Algebra Group")).toHaveCount(0);
  for (const path of [
    `/classes/${ids.c1}`,
    `/classes/${ids.c1}/attendance`,
    `/classes/${ids.c1}/grades`,
    `/classes/${ids.c1}/codes`,
    `/students/${ids.s1}`,
    `/plans/${ids.p1}`,
    `/worksheets/${ids.w1}`,
    `/worksheets/${ids.w1}/results`,
    `/worksheets/${ids.w1}/key`,
    `/assessments/${ids.a1}`,
  ]) {
    await member.goto(path);
    await expect(member.getByTestId("not-found"), path).toBeVisible();
    await expect(member.getByText("Ada Owner-Pupil")).toHaveCount(0);
  }
  await member.goto("/plans");
  await expect(member.getByText("Owner secret topic")).toHaveCount(0);
  await member.goto("/worksheets");
  await expect(member.getByText("Published owner sheet")).toHaveCount(0);

  // ...nor changes them: the owner's own rename request, replayed by the member, is refused.
  const owner = await (await runtime.context("owner")).newPage();
  await owner.goto(`/classes/${ids.c1}`);
  await owner.getByRole("button", { name: "Edit Ada Owner-Pupil" }).click();
  await owner.getByRole("dialog").getByLabel("Name").fill("Ada Renamed");
  const [request] = await Promise.all([
    owner.waitForRequest((r) => r.method() === "POST" && r.url().includes("/_serverFn/")),
    owner.getByRole("button", { name: "Save" }).click(),
  ]);
  await expect(owner.getByTestId("student-row").filter({ hasText: "Ada Renamed" })).toHaveCount(1);
  await owner.getByRole("button", { name: "Edit Ada Renamed" }).click();
  await owner.getByRole("dialog").getByLabel("Name").fill("Ada Owner-Pupil");
  await owner.getByRole("button", { name: "Save" }).click();
  await expect(owner.getByTestId("student-row").filter({ hasText: "Ada Owner-Pupil" })).toHaveCount(1);
  const headers = Object.fromEntries(
    Object.entries(request.headers()).filter(([k]) => k === "content-type" || k.startsWith("x-")),
  );
  await member.goto("/");
  await member.evaluate(
    ({ url, body, headers }) => fetch(url, { method: "POST", headers, body }).then((r) => r.status),
    { url: request.url(), body: request.postData(), headers },
  );
  const after = await db.prepare("select name from students where id = ?").bind(ids.s1).first();
  expect(after.name).toBe("Ada Owner-Pupil");

  // Admin overview: workspace admins only.
  await member.goto("/admin");
  await expect(member.getByTestId("admin-refused")).toBeVisible();
  await expect(member.getByText("Owner Algebra Group")).toHaveCount(0);
  await owner.goto("/admin");
  await expect(owner.getByText("Member History Set")).toBeVisible();
  await expect(owner.getByText("member@example.test")).toBeVisible();
  console.log("authorization: ok");
} finally {
  await runtime.close();
}
