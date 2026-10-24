-- Prevent unverified self-registration from attaching an account to a learner.
-- Existing parent/learner links are preserved; administrators continue to link
-- authorised parent accounts through the school-invite workflow.
drop trigger if exists profiles_link_family_signup_to_learner on public.profiles;
drop function if exists public.link_family_signup_to_learner();

-- Learner identifiers are not proof of guardianship. The public registration
-- endpoint is retired separately; family access must be provisioned by an
-- administrator against an existing parent record and verified email.
