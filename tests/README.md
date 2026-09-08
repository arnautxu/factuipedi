# UX regression checks

`npm run test:ux` builds the app and starts it against a local, in-memory PostgREST fixture on ports 4317/4318. It does not use production credentials or data. Chrome must be installed; set `PLAYWRIGHT_CHANNEL` to another supported installed channel if needed. `PLAYWRIGHT_MODULE` can point to a shared Playwright module instead of the local dependency.

The suite checks required clinic names, pending/double submission, success after redirect, failed save/retry, cancel/delete, archive/restore, preserving a patient's archived clinic assignment, filtered Excel content, full-month PDF output, status feedback, mobile overflow, catalog rollback and unsaved link navigation. Screenshots contain only synthetic data and are saved under `artifacts/ux-audit/`.

The test build contains a local fixture URL. Rebuild with the deployment environment before serving the app outside these tests. Vercel builds from Git with its configured environment.

`manage-clinic.sql` separately checks the real database function in a transaction that rolls back all fixtures. Apply the matching migration before running it. It checks empty deletion, history protection, archive/restore and execution permissions.

The navigation guard covers application links and closing/reloading the document. Native same-document browser Back/Forward is not intercepted.
