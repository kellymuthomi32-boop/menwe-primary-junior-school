# Environment Variables

Configure the following **public browser configuration values** in the intended Vercel project for both Preview and Production deployments.

| Variable | Example shape | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Directs the browser client to the existing Supabase project. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Allows the browser client to use Supabase Auth and RLS-protected APIs. |
| `VITE_SOCIAL_INSTAGRAM` | `https://www.instagram.com/...` | Optional official Menwe Instagram URL shown in the public footer. |
| `VITE_SOCIAL_FACEBOOK` | `https://www.facebook.com/...` | Optional official Menwe Facebook URL shown in the public footer. |
| `VITE_SOCIAL_YOUTUBE` | `https://www.youtube.com/@...` | Optional official Menwe YouTube URL shown in the public footer. |

The social variables are intentionally optional. The footer never invents a school social account: when a channel is not configured, its icon routes visitors to the Contact page instead. Configure only official school-owned URLs.

> Do not create or commit `.env` or `.env.example` files. Project variables must be managed through the secure environment-variable settings. Never expose a Supabase service-role key, database password, SMTP credential, M-Pesa secret, or `sb_secret` value to browser code, GitHub, or Vercel client variables.
