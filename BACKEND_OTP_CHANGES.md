# Backend Changes Required for OTP / 2FA Feature

This frontend update introduces a 2FA flow, "remember device", "logout-OTP", and an SMTP settings panel. The .NET API needs the following changes.

---

## 1. Login flow change

`POST /auth/login`

### Request body (additions in **bold**)

```json
{
  "loginId": "site.engineer",
  "password": "•••••",
  "deviceToken": "abcd1234..."   // NEW - may be null/missing on first login from this device
}
```

### Response — two paths

**Path A — Trusted device (deviceToken matches a stored, non-revoked record for this user):**
```json
{
  "msg": "Login Success",
  "isSucess": true,
  "id": 42,
  "cellNo": "9876543210",
  "emailId": "user@example.com",
  "otpRequired": false
}
```
→ Frontend goes straight to `/find-pile`. No OTP needed.

**Path B — First login OR unknown device OR device token revoked:**
```json
{
  "msg": "Login Success",
  "isSucess": true,
  "id": 42,
  "cellNo": "9876543210",
  "emailId": "u****@example.com",
  "otpRequired": true,
  "otpSessionId": "guid-here-12345"
}
```
→ Server has generated a 4-digit OTP, stored it linked to `otpSessionId` (with TTL ~5–10 mins), and emailed it to the user. Frontend redirects to `/otp` page.

### Server behaviour

- Look up user by `loginId`.
- Validate password (bcrypt or whatever you currently use).
- If credentials invalid → return `{ isSucess: false, msg: "Invalid credentials" }`.
- If credentials valid:
  - Check if `deviceToken` is provided AND matches a row in `UserDeviceToken` table for this user where `IsRevoked = 0` and not expired → return Path A.
  - Otherwise → generate a new `otpSessionId` (GUID), generate a 4-digit numeric OTP (`Random.Shared.Next(1000, 10000)`), store both in `OtpSession` table with the userId and an `ExpiresAt` (e.g. 10 minutes), send the OTP via SMTP, return Path B.

**Important:** Never include the actual OTP code in the API response. Only send via email.

---

## 2. NEW: Verify OTP

`POST /auth/verify-otp`

### Request body
```json
{
  "otpSessionId": "guid-here-12345",
  "otp": "1234",
  "rememberDevice": true
}
```

### Response (success)
```json
{
  "msg": "OTP verified",
  "isSuccess": true,
  "id": 42,
  "cellNo": "9876543210",
  "emailId": "user@example.com",
  "deviceToken": "long-random-token-only-when-rememberDevice-is-true"
}
```

### Response (failure)
```json
{ "msg": "Invalid or expired OTP", "isSuccess": false }
```

### Server behaviour

- Look up `OtpSession` by `otpSessionId`. If not found / expired / already-consumed → fail.
- Compare the provided `otp` against the stored hash. If mismatch → increment `AttemptCount`; if >= 5 → mark session as locked.
- If valid → mark `OtpSession.ConsumedAt = now`.
- If `rememberDevice == true`: insert a row into `UserDeviceToken` with a fresh GUID/random token (256 bits), `UserId = session.UserId`, `IsRevoked = 0`, `ExpiresAt = now + 90 days`. Return that token in the response.
- If `rememberDevice == false`: do NOT issue a deviceToken. The user will see OTP again next time on this device.

---

## 3. NEW: Resend OTP

`POST /auth/resend-otp`

```json
// Request
{ "otpSessionId": "guid-here-12345" }

// Response
{ "msg": "A new OTP has been sent", "isSuccess": true }
```

### Server behaviour

- Look up the session. If it's already consumed/expired, return failure.
- Throttle: reject if a resend was issued in the last 30 seconds for this session.
- Generate a fresh 4-digit OTP, update `OtpSession.OtpHash` and `ExpiresAt`, email it.

---

## 4. NEW: Logout (require OTP next time)

`POST /auth/logout-otp`

```json
// Request
{ "userId": 42 }

// Response
{ "msg": "Logged out", "isSuccess": true }
```

### Server behaviour

- Mark **all** rows in `UserDeviceToken` for this `UserId` as `IsRevoked = 1`.
- Result: any device that previously had a token for this user will fail the device-token check at next login and be forced through OTP.

> ⚠️ Note: this endpoint is currently called WITHOUT auth in the frontend (best-effort cleanup on logout). Recommend either: (a) require the in-memory token from the about-to-expire session, or (b) accept the userId and rely on rate limiting + the user already being authenticated by virtue of having a stored userId. Decide based on your security posture. The simpler "Logout" (no-OTP-next-time) doesn't hit the server at all — it's purely a frontend localStorage clear.

---

## 5. NEW: SMTP settings (admin)

`GET /admin/smtp` — returns current settings (password field MUST be omitted or returned as empty string for security):

```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "alerts@example.com",
  "fromAddress": "no-reply@fecindia.in",
  "fromName": "Bore Log System",
  "useSsl": true
}
```

If no settings configured yet, return **404**. The frontend handles this by showing blank fields.

`POST /admin/smtp` — saves settings:

```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "alerts@example.com",
  "password": "secret-or-blank-to-keep-existing",
  "fromAddress": "no-reply@fecindia.in",
  "fromName": "Bore Log System",
  "useSsl": true
}
```
Response: `{ "isSuccess": true, "msg": "Settings saved" }`

**Important:** if `password` is empty/null in the request, KEEP the existing password in the database — don't overwrite it with empty. The frontend deliberately blanks the password on display so the admin must type it again only when changing.

`POST /admin/smtp/test` — sends a test email:
```json
// Request
{ "toAddress": "you@example.com" }

// Response
{ "isSuccess": true, "msg": "Test email sent" }
```

**Authorisation:** these endpoints should be admin-only. The frontend currently exposes them via the in-app account menu — recommend adding a role check (e.g. only `userId == 1` or a `User.Role == 'Admin'` flag).

**Storage:** store the SMTP password encrypted at rest (e.g. ASP.NET Data Protection). It's a credential.

---

## 6. Database schema additions

### `OtpSession`
| Column        | Type            | Notes                                 |
| ------------- | --------------- | ------------------------------------- |
| Id            | uniqueidentifier PK | this is the `otpSessionId`        |
| UserId        | int FK          | the user attempting login             |
| OtpHash       | nvarchar(256)   | bcrypt/sha256 hash of the 4-digit OTP |
| AttemptCount  | int             | default 0; lock at 5                  |
| ExpiresAt     | datetime2       | now + 10 min                          |
| ConsumedAt    | datetime2 NULL  | set on successful verify              |
| LastResendAt  | datetime2 NULL  | for resend throttling                 |
| CreatedAt     | datetime2       | default now                           |

### `UserDeviceToken`
| Column        | Type            | Notes                                          |
| ------------- | --------------- | ---------------------------------------------- |
| Id            | int PK identity |                                                |
| UserId        | int FK          |                                                |
| TokenHash     | nvarchar(256)   | hash the token at rest; never store plain text |
| IsRevoked     | bit             | default 0                                      |
| ExpiresAt     | datetime2       | now + 90 days                                  |
| CreatedAt     | datetime2       |                                                |
| LastUsedAt    | datetime2 NULL  | useful for showing "active sessions"           |

### `SmtpSettings`
Single-row table or key-value config. Suggest a single-row `SystemSettings` table with these columns:

| Column                 | Type             |
| ---------------------- | ---------------- |
| SmtpHost               | nvarchar(256)    |
| SmtpPort               | int              |
| SmtpUsername           | nvarchar(256)    |
| SmtpPasswordEncrypted  | nvarchar(1024)   |
| SmtpFromAddress        | nvarchar(256)    |
| SmtpFromName           | nvarchar(128)    |
| SmtpUseSsl             | bit              |
| UpdatedAt              | datetime2        |
| UpdatedByUserId        | int              |

---

## 7. Email template for OTP

Plain-text and HTML version recommended. Suggested content:

> **Subject:** Your verification code — Bore Log System
>
> Hi,
>
> Your verification code for Bore Log System is:
>
> **1234**
>
> This code expires in 10 minutes. If you didn't request it, you can ignore this email.
>
> — Foundation Engineering Co.

---

## 8. Implementation notes

- Use `MailKit` (more reliable than `System.Net.Mail.SmtpClient` which is officially deprecated in .NET).
- Hash the OTP before storing — even though it's short-lived, don't store raw codes.
- Use a constant-time comparison when verifying OTPs to prevent timing attacks.
- Rate-limit `POST /auth/login` (e.g. 5 attempts per loginId per 15 minutes).
- Rate-limit `POST /auth/verify-otp` per session (the AttemptCount column does this).
- Log all 2FA events (login, OTP sent, OTP verified, device token issued, device token revoked) with userId for audit.

---

## Frontend storage summary (FYI)

- `localStorage["borelog_user"]` — current logged-in user
- `localStorage["borelog_device_token"]` — JSON map `{ "loginid": "tokenvalue" }` keyed by lowercase loginId so multiple users on the same device each keep their own device token
- `sessionStorage["borelog_otp_session"]` — `{ otpSessionId, loginId }` while waiting on the OTP entry page; cleared on success or when user navigates back to login
