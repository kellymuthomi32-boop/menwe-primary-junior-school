# Production deployment trigger

This file records the production deployment reconciliation after the examination workspace schema fix.

The examination workspace source on `main` uses `class_id,subject_id` for `class_subjects` and must be rebuilt before production is considered verified.
