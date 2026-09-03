const loadStats = async () => {
  if (!user || !profile || !effectiveAdmin) return;

  setLoadingStats(true);
  setError("");

  try {
    const db = getSupabase();

    const start = `${currentYear}-01-01T00:00:00+03:00`;
    const end = `${currentYear}-12-31T23:59:59+03:00`;

    const [
      learners,
      teachers,
      applications,
      events
    ] = await Promise.all([

      // Active learners count only
      db
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE"),

      // Active teachers count only
      db
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("status", "ACTIVE"),

      // Only fetch admissions needing review
      db
        .from("admission_applications")
        .select("id,status")
        .in("status", [
          "submitted",
          "pending",
          "under_review"
        ])
        .order("created_at", {
          ascending: false
        })
        .range(0, 49),

      // Current year events count
      db
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("starts_at", start)
        .lte("starts_at", end)

    ]);

    const firstError = [
      learners.error,
      teachers.error,
      applications.error,
      events.error
    ].find(Boolean);

    if (firstError) {
      throw firstError;
    }

    setStats({
      learners: learners.count ?? 0,
      teachers: teachers.count ?? 0,
      pendingAdmissions: applications.data?.length ?? 0,
      events: events.count ?? 0
    });

  } catch (err) {

    console.error(
      "Admin dashboard metrics error:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to load command-center metrics."
    );

  } finally {

    setLoadingStats(false);

  }
};
