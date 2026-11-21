# Budget Tracker

A browser-based budget tracker with private Supabase accounts, transaction management, monthly budgets, spending analytics, downloadable and printable receipts, and JSON import/export.

## Setup

1. Create a Supabase project.
2. Set the project URL and publishable (anon) key in `supabase-config.js`.
3. Run `supabase-schema.sql` in the Supabase SQL Editor to create the tables and enable per-user row-level security.
4. In Supabase Authentication > Sign In / Providers, keep new-user signups enabled. This deployment has **Confirm email** disabled so new users can sign in immediately after creating an account.
5. In Supabase Authentication > URL Configuration, add the app's deployed URL to the allowed redirect URLs for password reset links.
6. Serve the project files from a static web server and open `index.html`.

The app uses Supabase Auth and the REST API directly; it does not require a build step. Never put a Supabase service-role key in the browser app.

Each account can choose its currency from the dashboard. The initial choice uses the browser's regional locale when available. Amounts are converted from USD using the public daily currency feed; stored transactions and budgets remain in USD, and new input is converted back to USD before it is saved. The app sends only a request for USD exchange rates to the public provider, not account or transaction data. Rates are indicative, not a transaction quote. If rates are unavailable, the dashboard remains usable in USD and shows a notice. If an existing database has not yet been migrated, sign-in and budget tracking continue to work and the currency is saved in that browser until the currency column is added. Re-run `supabase-schema.sql` to enable account-wide currency settings.

The schema creates a private admin allowlist and a server-side visitor-records function. When the allowlist is empty, the first account by creation time that has signed in is added as the super admin. Run the updated `supabase-schema.sql` in the Supabase SQL Editor to enable this bootstrap and the admin-only **Visitors** button. That panel lists account emails and their last sign-in/account-creation times. It tracks authenticated accounts only, not anonymous page visitors, and it does not expose transaction data.

Disabling email confirmation means users can register an address they have not verified. Enable confirmation and configure custom SMTP instead if verified email ownership is required.

## Account recovery

On the sign-in screen, choose **Forgot password?** and enter the account email. The email link returns to the app, where the user can set and confirm a new password.

## Email delivery

Supabase's built-in email provider has a low sending limit. Password recovery still sends email, so configure a trusted custom SMTP provider in the Supabase Dashboard under **Authentication > SMTP Settings** for reliable delivery. Never put SMTP credentials in this browser app.

## Printable records

Use **Receipt** beside a transaction to print it, or **Download** to save a self-contained HTML receipt that can be opened offline or printed to PDF. **Print all records** prints the signed-in user's complete transaction history with totals. These are app-generated records, not merchant-issued receipts or proof that a payment cleared.
