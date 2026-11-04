# Security model and production deployment runbook

## Security model (summary)
* Every signed-in user has a profile `users/{uid}` = `{ role, driverId }`. It is the only source of authorization used by `firestore.rules`.
* A profile can be created only by a MASTER_ADMIN or by claiming an invitation: `invitations/{email}` holds a random one-time `token` that is e-mailed to the invitee and is unreadable by them in Firestore.
* Roles: `MASTER_ADMIN` (also manages managers), `MANAGER` (clients, drivers, schedule, registry), `DRIVER` (only own visits, schedule, shifts, incidents, deliveries; may edit signatures and access notes of own visits).
* Anything not listed in the rules is denied. 25 emulator tests: `npm run test:rules`.

---

## Production deployment runbook

Time needed: about 30 minutes. Do it when nobody is using the live app (the old client stops working under the new rules, and the new client needs the new rules).

### 0. Preconditions (on your machine, branch `security-hardening`)
```powershell
npm run lint; npm test; npm run test:rules; npm run test:e2e
```
All must pass. Java 21 must be installed (it is, if you ran the tests before).

### 1. Log in to Firebase
```powershell
npx firebase login
npx firebase use careconnect-d7bd7
npx firebase projects:list
```
`login` opens a browser: sign in with the Google account that owns the project and approve. `projects:list` must show `careconnect-d7bd7`.

### 2. Create a temporary service-account key (used only by the migration scripts)
1. Firebase console → ⚙ Project settings → **Service accounts** → **Generate new private key**.
2. Save the file **outside the repository**, e.g. `C:\Users\adams\secrets\careconnect-key.json`.
3. In the PowerShell window you will use for the next steps:
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\adams\secrets\careconnect-key.json"
```
Never paste the key into chat and never commit it (`.gitignore` already blocks `service-account*.json`).

### 3. Back up the live data
```powershell
npm run backup
```
Creates `backups/careconnect-d7bd7-<time>.json` (Auth user list + every collection). Keep it until the competition is over.

### 4. Preview the role migration (changes nothing)
```powershell
npm run migrate:profiles
```
Read the table:
* `create` / `update` – the profile that will be written (role and, for drivers, `driverId`).
* `delete` – an existing `users` document that no admin/driver record justifies. Under the old open rules anyone could write any role into their own document, so these are removed.
* Warnings – accounts with no admins/drivers record will have **no access** (expected for strangers; unexpected for your own accounts – then stop and check the e-mail spelling in the `admins`/`drivers` record).
* `redjebtudjar@gmail.com` must appear as `MASTER_ADMIN`.

This exact script was rehearsed on legacy-shaped emulator data (`npm run migrate:rehearse`): it fixed a wrong role, created missing profiles, removed a rogue self-assigned MANAGER profile and was idempotent on the second run.

### 5. Apply the migration
```powershell
npm run migrate:profiles -- --apply
npm run migrate:profiles
```
The second run must report `0 change(s) planned`.

### 6. Deploy rules, indexes and the app
```powershell
npx firebase deploy --only firestore,hosting
```
(`hosting` runs `npm run build` first.) Wait for "Deploy complete". The Firestore index for `shifts` may take a few minutes to build; ending a shift fails until it is ready (Firebase console → Firestore → Indexes).

### 7. Smoke test on the live site
Use a private window.
| Check | Expected |
|---|---|
| `redjebtudjar@gmail.com` logs in | Admin panel with the "Мениджъри" tab |
| Test manager logs in | Admin panel, no "Мениджъри" tab; schedule and "Аналитика" load |
| Test driver logs in | Own route only; start shift; access note visible |
| Driver opens `/admin/dashboard` | Access denied or redirected back |
| Master adds a test driver (real mailbox you own) | Invitation e-mail arrives; link opens the activation page; after setting a password the driver lands on the route screen |
| Re-use the same activation link | "Поканата е невалидна…" |

### 8. Clean up
```powershell
Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
```
Then **delete the key**: Firebase console → Project settings → Service accounts → Manage service account permissions → Keys → delete it, and delete the local file.

### 9. Rotate the demo credentials
The old passwords are written in the documentation PDF on a public site.
Firebase console → Authentication → Users: for each test account either use ⋮ → *Reset password* (needs a mailbox) or **delete the user and Add user again** with a new password, then re-run steps 2–5 (`npm run migrate:profiles -- --apply` is idempotent and re-links the new uid by e-mail). Put the new credentials only in the jury sheet, never in the repository.

### Rollback
* **App:** Firebase console → Hosting → Release history → previous release → *Rollback*.
* **Rules:** `git show main:firestore.rules > firestore.rules.rollback` then temporarily point `firebase.json` at it and `npx firebase deploy --only firestore:rules`, or paste the old rules in the console (Firestore → Rules → Publish). Note: the old rules are open to every signed-in user – roll back only to recover from an outage.
* **Data:** the migration only touches `users` (and sets `uid`/`status` on matching `admins`/`drivers` records). Restore from `backups/…json` if needed.

---

## Known limitations
* An attacker who knows an invited e-mail address can register it before the invitee (denial of service only, no access is gained). Delete the Auth user in the console and re-invite.
* EmailJS public keys live in the client; restrict the allowed domains in the EmailJS dashboard.
* For stronger guarantees move invitations and e-mail sending to a Cloud Function (Blaze plan) and use custom claims.

## Local demo (no production access needed)
`npm run demo` → http://localhost:5173 with fake data. Accounts: `master@demo.bg`, `manager@demo.bg`, `driver@demo.bg`, `driver2@demo.bg` – password `Demo12345!` (exist only in the local emulator).
