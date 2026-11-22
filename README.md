# Class Notebook

A workspace for teachers: plan lessons, build worksheets that students answer with a class code and get scored automatically, and keep attendance, marks and a results page for each student's family.

Inspired by https://aiteachersplanner.com

Built with [oss.new](https://oss.new) for [EveryApp](https://github.com/every-app/every-app).

## Features

- Create classes, add students one at a time or as a pasted list, and print each student's access code.
- Write daily lesson plans with objectives, timed stages, materials and assessment; filter, duplicate and print them.
- Build worksheets with multiple choice, short answer and open questions at three levels, with print and answer-key views.
- Students answer published worksheets with their code; choice and short answers are scored on submit and you mark open answers.
- Take attendance with participation and notes, enter assessment marks, and see a class gradebook and per-student summary.
- Share a student's results with their family through a private link and PIN, see when it was viewed, and revoke it.

Left out: accounts and sign-in, which your Gateway handles; plans and billing; classroom games; a curriculum library; live classroom mode; extra planning types; diagnostic tests and reports; certificates and grade importers; an installable app.

## Setup

- Install: `pnpm install`, then `pnpm everyapp install <repository url>` or `pnpm run deploy` from a checkout.
- Run locally: `pnpm dev`. Test: `pnpm test` for unit tests; `checks/` holds the release checks.
- Nothing has to be set before the app opens. The optional **AI drafting** feature adds a "Draft with AI" button to lesson plans and worksheets once an OpenRouter key is on your Gateway: `pnpm everyapp provider add openrouter` ([keys](https://openrouter.ai/keys)).

## Limitations

- Students and families open `/student` and `/family/…` without an account; anyone with a student's code can answer as that student, so hand codes out privately.
- A family link locks after five wrong PINs; make a new link and PIN from the student's page.
- AI drafting uses OpenRouter's `openai/gpt-4o-mini` and was not exercised in local checks.
