# Setting up Compass online (phase 1: Google sign-in)

Compass's sign-in code is built and tested. It stays hidden in the app until it has your project's details.
This takes about 15 minutes, once. Everything here is free at this stage.

## 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> and sign in with the Google account that should own Compass.
2. **Create a project** → name it `Compass` → you can turn Google Analytics off → **Create project**.

## 2. Turn on Google sign-in
1. Left menu: **Build › Authentication** → **Get started**.
2. **Sign-in method** tab → **Google** → switch **Enable** on → pick your support email → **Save**.

## 3. Create the database and lock it down
1. Left menu: **Build › Firestore Database** → **Create database**.
2. Pick a location close to your users (for the US, `nam5`). You can't change it later.
3. Start in **production mode** → **Create**.
4. Open the **Rules** tab, replace everything with the contents of [`firestore.rules`](firestore.rules) from this folder, and click **Publish**.
   These rules let each person read and write only their own profile; everything else stays closed.

## 4. Copy two values from Firebase
Gear icon (top left) → **Project settings** → **General**:
- **Project ID** (for example `compass-1a2b3`)
- **Web API Key** (starts with `AIza…`)

## 5. Create the desktop sign-in client (Google Cloud)
Firebase projects are also Google Cloud projects, so this uses the same project.
1. Go to <https://console.cloud.google.com>, and pick the **Compass** project at the top.
2. **APIs & Services › OAuth consent screen** (may be called **Google Auth Platform › Branding**):
   - User type **External**, app name `Compass`, your support email, developer email → save.
   - Scopes: leave the defaults (`openid`, `email`, `profile`). These basic scopes don't need Google's review.
   - **Audience / Publishing status:** while it says *Testing*, only the Google accounts you add under **Test users** can sign in.
     Add yourself (and anyone testing). Click **Publish app** when you want anyone to be able to sign in.
3. **APIs & Services › Credentials** → **Create credentials › OAuth client ID** →
   Application type **Desktop app** → name `Compass Desktop` → **Create**.
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) and the **Client secret**.

## 6. Send the four values
- Firebase **Project ID**
- Firebase **Web API Key**
- Google **Client ID**
- Google **Client secret**

They go into `desktop/online.json` inside the installer. None of them are passwords: Firebase API keys are public by design
(the security rules are what protect the data), and Google treats a desktop app's client secret as non-confidential.

```json
{
  "googleClientId": "….apps.googleusercontent.com",
  "googleClientSecret": "…",
  "firebaseApiKey": "AIza…",
  "firebaseProjectId": "compass-…"
}
```

## What phase 1 does
- **Settings › Profile › Account › Sign in with Google** opens your browser to Google's normal sign-in page.
- After you pick your account, the browser tab says "Signed in" and Compass shows your name and email.
- Your artist name is saved to your profile online and comes back when you sign in on another computer.
- Your login is stored encrypted with Windows' own protection (DPAPI), never as plain text.

## Next phases (from the plan)
2. Cloud backup of projects and files.
3. Server-backed Music Store: owner-only releases, verified badge, previews.
4. Payments (Stripe), ownership records, subscription.
