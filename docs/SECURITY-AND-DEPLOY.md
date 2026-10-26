# Security model and deployment checklist

## Model
* Every signed-in user has a profile `users/{uid}` = `{ role, driverId }`. It is the only source of authorization used by `firestore.rules`.
* A profile can be created only by a MASTER_ADMIN or by claiming an invitation: `invitations/{email}` holds a random one-time `token` that is only e-mailed to the invitee and is unreadable by them in Firestore.
* Roles: `MASTER_ADMIN` (manages managers/roles), `MANAGER` (clients, drivers, schedule, registry), `DRIVER` (only own visits, own schedule, own shifts/incidents/deliveries; may edit signatures and access notes of own visits).
* Everything not listed in the rules is denied. 25 emulator tests: `npm run test:rules`.

## Deploying (order matters – the old client breaks under the new rules)
1. `firebase login` and `firebase use careconnect-d7bd7`.
2. Create `users/{uid}` documents for every existing account (Authentication tab shows each uid):
   * managers/admins: `{ uid, email, role: "MANAGER" | "MASTER_ADMIN" }`
   * drivers: `{ uid, email, role: "DRIVER", driverId: "<id of the document in drivers>" }`
   * the owner (`redjebtudjar@gmail.com`) works without a document (bootstrap rule).
3. `npm run build`, then `firebase deploy --only firestore,hosting`.
4. Rotate every password that was ever written in documentation; use dedicated demo accounts for the jury.
5. In Firebase Console → Authentication → Settings, keep only the Email/Password provider and enable email enumeration protection.

## Known limitations
* An attacker who knows an invited e-mail can register it before the invitee (denial of service only, no access is gained). Re-invite with another address.
* EmailJS public keys live in the client; limit the allowed domains in the EmailJS dashboard.
* For stronger guarantees move invitations and e-mail sending to a Cloud Function (Blaze plan) and use custom claims.
