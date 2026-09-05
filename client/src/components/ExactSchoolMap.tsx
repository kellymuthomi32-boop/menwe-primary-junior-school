import { MapPin, Navigation } from "lucide-react";

export const SCHOOL_LOCATION = {
  name: "Menwe Primary & Junior School",
  latitude: -0.099245555,
  longitude: 37.58121778,
  region: "Igoki, Abogeta Division, South Imenti Constituency, Meru County, Kenya",
} as const;

const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${SCHOOL_LOCATION.latitude},${SCHOOL_LOCATION.longitude}`;
const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${SCHOOL_LOCATION.latitude}&mlon=${SCHOOL_LOCATION.longitude}#map=17/${SCHOOL_LOCATION.latitude}/${SCHOOL_LOCATION.longitude}`;
const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=37.57521778,-0.103245555,37.58721778,-0.095245555&layer=mapnik&marker=${SCHOOL_LOCATION.latitude},${SCHOOL_LOCATION.longitude}`;

export default function ExactSchoolMap() {
  return (
    <section className="rounded-3xl border border-gray-100 bg-[var(--paper,#fff)] p-5 shadow-md sm:p-7 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="exact-location-heading">
      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr] lg:items-stretch">
        <div className="flex flex-col justify-between rounded-2xl bg-[#061229] p-6 text-white sm:p-7">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D89B28]/15 text-[#D89B28]" aria-hidden="true">
              <MapPin size={22} />
            </div>
            <p className="mt-6 inline-flex rounded-full bg-[#D89B28]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#D89B28]">Find Us</p>
            <h2 id="exact-location-heading" className="mt-3 font-serif text-2xl font-semibold sm:text-3xl">{SCHOOL_LOCATION.name}</h2>
            <p className="mt-4 text-sm leading-7 text-white/70">{SCHOOL_LOCATION.region}</p>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <p className="font-bold text-white">Exact GPS coordinates</p>
              <p className="mt-1 font-mono text-xs text-white/65">{SCHOOL_LOCATION.latitude}, {SCHOOL_LOCATION.longitude}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-4 py-3 text-center text-sm font-extrabold text-[#061229] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 focus:ring-offset-[#061229]"
            >
              <Navigation size={16} aria-hidden="true" />
              Google Maps
            </a>
            <a
              href={openStreetMapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#D89B28]"
            >
              Open map
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-slate-100 dark:border-slate-800">
          <iframe
            title="Menwe Primary & Junior School exact GPS location map"
            src={embedUrl}
            className="h-[360px] min-h-full w-full border-0 sm:h-[430px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}
