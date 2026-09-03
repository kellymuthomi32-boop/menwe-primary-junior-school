/* Menwe admin overview: live, explicit metrics with safe empty and error states. */
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { isAdministrator, useSchoolAuth } from "@/contexts/SupabaseAuthContext";
import { getSupabase } from "@/lib/supabase";
import { PortalLayout } from "@/components/PortalLayout";

type Stats = {
  learners: number;
  teachers: number;
  pendingAdmissions: number;
  events: number;
};

type Shortcut = {
  href: string;
  label: string;
  Icon: typeof Users;
};

const emptyStats: Stats = {
  learners: 0,
  teachers: 0,
  pendingAdmissions: 0,
  events: 0,
};

const shortcuts: Shortcut[] = [
  {
    href: "/portal/people",
    label: "People & enrolment",
    Icon: Users,
  },
  {
    href: "/portal/attendance",
    label: "Attendance",
    Icon: ClipboardCheck,
  },
  {
    href: "/portal/academics",
    label: "Academics",
    Icon: BookOpen,
  },
  {
    href: "/portal/operations",
    label: "Operations & reports",
    Icon: BarChart3,
  },
];

export default function AdminDashboardHubPage() {
  const { user, profile } = useSchoolAuth();
  const [, navigate] = useLocation();

  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    if (!user || !profile) return;

    if (!isAdministrator(profile.role)) {
      navigate("/portal");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const db = getSupabase();

      const currentYear = new Date().getFullYear();

      const start = `${currentYear}-01-01T00:00:00+03:00`;
      const end = `${currentYear}-12-31T23:59:59+03:00`;

      const [
        learners,
        teachers,
        applications,
        events,
      ] = await Promise.all([
        db
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("status", "ACTIVE"),

        db
          .from("teachers")
          .select("id", { count: "exact", head: true })
          .eq("status", "ACTIVE"),

        db
          .from("admission_applications")
          .select("id,status")
          .in("status", [
            "submitted",
            "pending",
            "under_review",
          ])
          .order("created_at", {
            ascending: false,
          })
          .range(0, 49),

        db
          .from("events")
          .select("id", {
            count: "exact",
            head: true,
          })
          .gte("starts_at", start)
          .lte("starts_at", end),
      ]);

      const firstError = [
        learners.error,
        teachers.error,
        applications.error,
        events.error,
      ].find(Boolean);

      if (firstError) {
        throw new Error(firstError.message);
      }

      setStats({
        learners: learners.count ?? 0,
        teachers: teachers.count ?? 0,
        pendingAdmissions:
          applications.data?.length ?? 0,
        events: events.count ?? 0,
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
      setLoading(false);
    }
  }, [navigate, profile, user]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const metrics = [
    {
      label: "Active learners",
      value: stats.learners,
      detail: "Current active student records",
      Icon: Users,
    },
    {
      label: "Active educators",
      value: stats.teachers,
      detail: "Current teacher records",
      Icon: GraduationCap,
    },
    {
      label: "Admissions to review",
      value: stats.pendingAdmissions,
      detail: "Submitted or pending applications",
      Icon: ClipboardCheck,
    },
    {
      label: "Events this year",
      value: stats.events,
      detail: "Published events in the current year",
      Icon: CalendarDays,
    },
  ];

  return (
    <PortalLayout role={profile?.role ?? "ADMIN"}>
      <div className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 lg:p-8">

        <header className="menwe-admin-hero relative overflow-hidden rounded-[2.25rem] p-6 text-white shadow-2xl sm:p-9 lg:p-11">
          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <span className="menwe-admin-kicker">
                <BarChart3 size={14}/>
                School command &amp; reports
              </span>

              <h1 className="mt-5 text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">
                Command the school from one place.
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/75">
                A live overview of learners, educators,
                admissions and the school calendar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadStats()}
              disabled={loading}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 text-sm font-bold transition hover:bg-white/[.12] disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh live data
            </button>

          </div>
        </header>


        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          >
            <AlertTriangle size={18}/>
            {error}
          </div>
        )}


        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {metrics.map(
            ({
              label,
              value,
              detail,
              Icon,
            }) => (
              <article
                key={label}
                className="menwe-admin-metric rounded-[1.35rem] p-5"
              >

                <div className="flex items-start justify-between gap-3">

                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--accent)]">
                    <Icon size={20}/>
                  </span>

                  <span className="text-right text-2xl font-black text-[var(--ink)]">
                    {loading ? (
                      <Loader2
                        size={22}
                        className="animate-spin text-[var(--accent)]"
                      />
                    ) : (
                      value
                    )}
                  </span>

                </div>

                <div className="mt-5 flex items-center gap-2">
                  <p className="text-sm font-extrabold text-[var(--ink)]">
                    {label}
                  </p>

                  {!loading && (
                    <CheckCircle2
                      size={14}
                      className="text-emerald-600"
                    />
                  )}
                </div>

                <p className="mt-1 text-xs leading-5 text-[var(--ink)]/55">
                  {detail}
                </p>

              </article>
            )
          )}

        </section>


        <section className="grid gap-5 lg:grid-cols-2">

          <article className="menwe-card rounded-[1.75rem] p-6 sm:p-7">

            <p className="menwe-premium-label">
              Reporting shortcuts
            </p>

            <h2 className="menwe-premium-title mt-1">
              Go straight to the work.
            </h2>


            <div className="mt-5 grid gap-2 sm:grid-cols-2">

              {shortcuts.map(
                ({
                  href,
                  label,
                  Icon,
                }) => (

                <button
                  key={href}
                  type="button"
                  onClick={() => navigate(href)}
                  className="menwe-admin-action flex w-full items-center justify-between rounded-xl p-4 text-left text-sm font-bold"
                >

                  <span className="flex items-center gap-3">
                    <Icon
                      size={17}
                      className="text-[var(--accent)]"
                    />
                    {label}
                  </span>

                  <ArrowUpRight
                    size={16}
                    className="text-[var(--accent)]"
                  />

                </button>

              ))}

            </div>

          </article>


          <article className="menwe-card rounded-[1.75rem] p-6 sm:p-7">

            <p className="menwe-premium-label">
              Access boundary
            </p>

            <h2 className="menwe-premium-title mt-1">
              Live data, explicit gaps.
            </h2>

            <p className="mt-4 text-sm leading-7 text-[var(--ink)]/65">
              This command center only renders data returned
              for the authenticated administrator.
            </p>

          </article>

        </section>

      </div>
    </PortalLayout>
  );
}
