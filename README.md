# FitBuddy AI

FitBuddy AI is a responsive fitness dashboard with a Node.js backend, personalized progressive workouts, and optional Gemini-powered workout plan generation.

## Run locally

Install Node.js 20 or newer, then run:

```bash
npm install
npm start
```

Open <http://localhost:3000>.
New users can create an account from the sign-in screen. Passwords must be at least 8 characters.

## Generate a Gemini fitness plan

AI plan generation uses the Gemini Developer API from the server. Set your API key as a server environment variable; never add it to frontend files or commit it to source control. You can create a key in [Google AI Studio](https://aistudio.google.com/apikey).

```powershell
$env:GEMINI_API_KEY = "your-gemini-api-key"
$env:GEMINI_MODEL = "gemini-2.5-flash"
npm run dev
```

`GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`; set it to another model available to your API key if needed. After signing in and completing your fitness profile, select **Generate with Gemini** in the workout plan panel. The generated Monday, Wednesday, and Friday sessions are saved to your account, survive reloads, and retain the app's level and workout-completion tracking. Changing the profile details invalidates the old plan; generate a fresh one for the new profile. Plan generation is limited to one request per account every 30 seconds.

When you request a plan, your age, weight, fitness goal, workout intensity, and progression level are sent to Google Gemini to generate it. The app asks for conservative workouts and checks the response format and intensity before saving. AI output is general fitness guidance, not medical advice; review exercises and stop if anything causes pain. Do not use this feature as a substitute for advice from a qualified professional.

The AI Coach also uses the configured Gemini model to answer general questions about exercise, fitness, nutrition, recovery, and body health. It receives the current message, recent messages in that conversation, and only your age, fitness goal, and workout intensity for context. Do not share identifying, financial, or other sensitive information in chat. It cannot diagnose conditions or replace a clinician; urgent symptoms should be handled by local emergency services. Chat replies require `GEMINI_API_KEY`. If the key is missing or Gemini is unavailable, the app shows an error and does not save a fabricated answer.

Each exercise in the weekly plan includes a **YouTube demo** link. It opens YouTube search results for that exercise and proper form in a new tab so you can choose a video that suits you. Review demonstrations carefully and use a comfortable range of motion.

## Test the sign-in page on an Android phone

1. Connect the computer running FitBuddy AI and the Android phone to the same trusted Wi-Fi network.
2. Start the app on the computer with `npm start` (or `npm run dev`). The terminal prints a Wi-Fi URL such as `http://192.168.1.20:3000/login`.
3. Open that URL in Chrome on the phone. Sign in with an existing account or tap **Create an account** to register.
4. If the page does not load, allow Node.js through Windows Defender Firewall on **Private networks** only, and check that both devices are on the same Wi-Fi.

The server listens on all network interfaces by default for local-device testing. Set `HOST` to `127.0.0.1` to make it accessible only from the computer. This local HTTP setup is for development on a trusted network only: do not use sensitive passwords or expose port 3000 to the internet. Use an HTTPS deployment for real accounts. Google OAuth also needs a redirect URI matching the address used on the phone.

For automatic server restarts while editing:

```bash
npm run dev
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account with a name, email, and password |
| `POST` | `/api/auth/login` | Sign in with email and password |
| `POST` | `/api/auth/logout` | End the current session |
| `GET` | `/api/auth/me` | Get the signed-in user |
| `GET` | `/auth/google` | Start Google OAuth sign-in |
| `GET` | `/api/dashboard` | Profile, daily stats, weekly activity, and recommended workouts |
| `GET` | `/api/profile` | Saved personal and fitness profile |
| `PUT` | `/api/profile` | Save name, email, age, weight, fitness goal, and workout intensity |
| `GET` | `/api/workout-plan` | Build a weekly plan from the signed-in user's fitness goal and intensity |
| `POST` | `/api/workout-plan/generate` | Generate and save a profile-based workout plan using Gemini |
| `POST` | `/api/workout-plan/:day/complete` | Mark a scheduled workout day complete; three completed days unlock the next level the following week |
| `GET` | `/api/nutrition-advice` | Goal- and intensity-aware general nutrition tips |
| `GET` | `/api/chats` | List the signed-in user's conversations |
| `POST` | `/api/chats` | Create a new conversation |
| `GET` | `/api/chats/:id/messages` | Load messages for one conversation |
| `POST` | `/api/chats/:id/messages` | Get a Gemini fitness and general health reply and save the conversation |
| `GET` | `/api/workouts` | All available workouts |
| `GET` | `/api/progress` | Step-goal progress and streak information |
| `POST` | `/api/workouts/:id/start` | Create a workout session |

The dashboard and fitness APIs require a signed-in session. User accounts and password hashes are stored in `data/auth.json`. Passwords are hashed with Node.js scrypt; sessions use HttpOnly cookies and expire after seven days. Workout sessions are stored in `data/fitness.json`.

Successful email/password and Google sign-ins send a sign-in confirmation email after authentication. This email is a login alert, not a verification code; sign-in is not blocked while waiting for the email. The app loads local environment variables from `.env`; real secrets belong in this private file, never in frontend code or a shared message.

```powershell
Copy-Item .env.example .env
notepad .env
npm run dev
```

For Gmail, enable 2-Step Verification on the sender account, then [create a Google App Password](https://myaccount.google.com/apppasswords). Put the Gmail address in `SMTP_USER` and the generated 16-character app password in `SMTP_PASS` (remove any display spaces); do not use your normal Google account password. Keep `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, and `SMTP_SECURE=true`. Use the same Gmail address as `SMTP_FROM`, for example `SMTP_FROM="FitBuddy AI <you@gmail.com>"`. Save `.env`, then restart `npm run dev`. Sign in with an account whose inbox you can access and look for **FitBuddy AI sign-in confirmed**. Check spam/junk if it does not appear.

For another mail provider, use that provider's SMTP host, port, TLS settings, username, and app-specific password. If SMTP is missing or delivery fails, sign-in still succeeds; the page/dashboard reports that the email was not sent. `.env` is excluded from Git; `.env.example` contains placeholders only.

The personalized plan has four progressive levels, including an Advanced stage, with three goal- and intensity-based workout days, recovery activities, and rest days per week. Mark all three workouts complete to unlock the next level the following week. Age is used only for conservative duration guidance; weight is shown as profile context, not as a measure of exercise capacity. Nutrition tips are general guidance and do not calculate calories or prescribe diets. Consult a qualified healthcare professional for personal medical or nutrition advice.

The AI Coach page at `/chat` keeps separate conversations in the signed-in user's account. Chat questions and recent conversation context are sent to Google Gemini to generate the reply; workout plan generation also uses Gemini. The API key remains on the server.

### Google sign-in setup

Create a Google OAuth 2.0 Web application client. Add `http://localhost:3000/auth/google/callback` as an authorized redirect URI. If `.env` does not exist yet, first copy `.env.example` to `.env`. Add the client ID and secret to the optional Google entries, then run:

```powershell
notepad .env
npm run dev
```

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `.env`. If `.env` already exists for email setup, edit that file rather than copying over it. Use an HTTPS redirect URI for production.

Google sign-in displays a setup message until OAuth credentials are configured. For production, use HTTPS, set `COOKIE_SECURE=true`, and replace JSON-file storage and in-memory sessions with a database and shared session store.
