# Frontend Changes — This Update

## Find Pile Page
- Pile No. input now forces uppercase as the user types (`P-247` not `p-247`).

## Bore Log Page
- All numeric inputs now show `0.000` as a placeholder when empty, instead of a stuck `0`.
- **Liner & Reference Levels** card reordered to:
  1. EGL — Existing Ground Level
  2. Liner Length
  3. Casing Length
  4. Actual
  5. Casing Top
  6. Soil Bore (Time + Depth From → To)
  7. Rock Bore (Time + Depth From → To)
  8. Empty Bore (After Concrete)
  9. Concrete Bore (After Concrete)
- **Green-tick completion** now lights up on:
  - **Liner & Reference Levels** — when all 14 values (5 levels + 4 soil bore + 4 rock bore + 2 after-concrete) are filled.
  - **Site Personnel** — when all 3 roles (Operator, Liner/Bender, Fitter) are selected.
  - **Remarks** — when remarks are non-empty.

## Login Page → OTP / 2FA flow
- After credentials are validated, the API may return `otpRequired: true` with an `otpSessionId`. Frontend then redirects to a new `/otp` page.
- **OTP page** — 4 single-digit input boxes, paste support, 30-second resend cooldown, "Remember this device" checkbox.
- **Trusted device flow** — when a user has previously logged in and ticked "Remember this device", the API returns a device token. The frontend stores it locally. On subsequent logins the token is sent with `/auth/login`; if accepted, OTP is skipped entirely.
- **Different user on same device** — device token is keyed per loginId, so a different user logging in on the same device will still go through OTP (separate token).

## Account menu
- The `⋯` icon in the page header now opens a small dropdown with three options:
  1. **Logout** — local session clear; OTP NOT required next login on this device.
  2. **Logout (require OTP)** — clears local session AND calls `/auth/logout-otp` to revoke device tokens server-side; OTP WILL be required next login.
  3. **SMTP Settings** — opens admin page.

## SMTP Settings page (`/admin/smtp`)
- Form for host, port, username, password, from-address, from-name, SSL toggle.
- "Send test email" feature.
- Password input shows blank on load (server should never return the stored password); leaving it blank on save means "keep existing".

## Routes
- `/login` — login (existing, updated)
- `/otp` — NEW — OTP verification page
- `/find-pile` — find pile (existing)
- `/borelog/:projectId/:pileNo` — bore log entry (existing, with reordering)
- `/admin/smtp` — NEW — SMTP settings

## Removed dead code
- `src/hooks/useAutoSave.ts` and `src/components/AutoSavePill.tsx` — neither was imported anywhere.

## Backend work needed
See **BACKEND_OTP_CHANGES.md** in this folder for the full API contract the .NET API needs to implement before this build is wired up to the live backend.
