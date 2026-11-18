# Budget Tracker

A browser-based budget tracker with private Supabase accounts, transaction management, monthly budgets, spending analytics, printable transaction records, and JSON import/export.

## Setup

1. Create a Supabase project.
2. Set the project URL and publishable (anon) key in `supabase-config.js`.
3. Run `supabase-schema.sql` in the Supabase SQL Editor to create the tables and enable per-user row-level security.
4. In Supabase Authentication > Sign In / Providers, keep new-user signups enabled. This deployment has **Confirm email** disabled so new users can sign in immediately after creating an account.
5. In Supabase Authentication > URL Configuration, add the app's deployed URL to the allowed redirect URLs for password reset links.
6. Serve the project files from a static web server and open `index.html`.

The app uses Supabase Auth and the REST API directly; it does not require a build step. Never put a Supabase service-role key in the browser app.

Disabling email confirmation means users can register an address they have not verified. Enable confirmation and configure custom SMTP instead if verified email ownership is required.

## Account recovery

On the sign-in screen, choose **Forgot password?** and enter the account email. The email link returns to the app, where the user can set and confirm a new password.

## Email delivery

Supabase's built-in email provider has a low sending limit. Password recovery still sends email, so configure a trusted custom SMTP provider in the Supabase Dashboard under **Authentication > SMTP Settings** for reliable delivery. Never put SMTP credentials in this browser app.

## Printable records

Use **Print** beside a transaction to print an individual income or expense record, or **Print all records** to print the signed-in user's complete transaction history with totals. These are app-generated records, not merchant-issued receipts or proof that a payment cleared.
