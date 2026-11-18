# Budget Tracker

A browser-based budget tracker with private Supabase accounts, transaction management, monthly budgets, spending analytics, and JSON import/export.

## Setup

1. Create a Supabase project.
2. Set the project URL and publishable (anon) key in `supabase-config.js`.
3. Run `supabase-schema.sql` in the Supabase SQL Editor to create the tables and enable per-user row-level security.
4. In Supabase Authentication settings, add the app's deployed URL to the allowed redirect URLs. Password reset links redirect to the current app page.
5. Serve the project files from a static web server and open `index.html`.

The app uses Supabase Auth and the REST API directly; it does not require a build step. Never put a Supabase service-role key in the browser app.

## Account recovery

On the sign-in screen, choose **Forgot password?** and enter the account email. The email link returns to the app, where the user can set and confirm a new password. Configure the deployed URL in Supabase's allowed redirect URLs for this to work outside localhost.

If a new account requires email confirmation, check the inbox after signing up. The sign-in screen can resend the confirmation link if needed.
