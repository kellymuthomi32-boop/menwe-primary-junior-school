import { ExternalLink, MapPin, Navigation } from "lucide-react";

export const SCHOOL_LOCATION = {
  name: "Menwe Primary & Junior School",
  latitude: -0.099245555,
  longitude: 37.58121778,
  region: "Igoki, Abogeta Division, South Imenti Constituency, Meru County, Kenya",
} as const;

const googleMapsUrl = "https://www.google.com/maps/place/0%C2%B005'57.3%22S+37%C2%B034'52.4%22E/@-0.0992456,37.5812178,17z/data=!3m1!4b1!4m4!3m3!8m2!3d-0.0992456!4d37.5812178?entry=ttu&g_ep=EgoyMDI2MDkwMi4wIKXMDSoASAFQAw%3D%3D";
const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${SCHOOL_LOCATION.latitude}&mlon=${SCHOOL_LOCATION.longitude}#map=17/${SCHOOL_LOCATION.latitude}/${SCHOOL_LOCATION.longitude}`;

const TILE_ZOOM = 17;
const TILE_X = 79218;
const TILE_Y = 65572;
const TILE_OFFSET_X = 0.9038246 * 256;
const TILE_OFFSET_Y = 0.1342219 * 256;
const tileUrls = Array.from({ length: 9 }, (_, index) => {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return `https://tile.openstreetmap.org/${TILE_ZOOM}/${TILE_X + column - 1}/${TILE_Y + row - 1}.png`;
});

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
              <p className="mt-1 font-mono text-xs text-white/65">0°05'57.3&quot;S, 37°34'52.4&quot;E</p>
              <p className="mt-1 text-xs text-white/50">-0.099245555, 37.58121778</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#D89B28] px-4 py-3 text-center text-sm font-extrabold text-[#061229] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#D89B28] focus:ring-offset-2 focus:ring-offset-[#061229]">
              <Navigation size={16} aria-hidden="true" />
              Google Maps
            </a>
            <a href={openStreetMapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#D89B28]">
              Open map <ExternalLink size={15} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-gray-100 bg-[#e8e5df] dark:border-slate-800 sm:min-h-[430px]" aria-label="Interactive map showing the exact Menwe Primary & Junior School coordinates">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute left-1/2 top-1/2 grid w-[768px] grid-cols-3"
              style={{
                height: 768,
                transform: `translate(calc(-50% - ${TILE_OFFSET_X}px), calc(-50% - ${TILE_OFFSET_Y}px))`,
              }}
            >
              {tileUrls.map((src, index) => (
                <img key={src} src={src} alt="" aria-hidden="true" className="block h-64 w-64 max-w-none select-none object-cover" draggable={false} loading={index === 4 ? "eager" : "lazy"} />
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10" aria-hidden="true" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full" aria-label="Menwe Primary & Junior School exact location">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#D89B28] text-[#061229] shadow-2xl ring-4 ring-[#D89B28]/25">
              <MapPin size={27} fill="currentColor" aria-hidden="true" />
            </div>
            <div className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#061229] px-3 py-2 text-center text-xs font-bold text-white shadow-lg">
              Menwe Primary &amp; Junior School
              <span className="mt-0.5 block text-[10px] font-normal text-white/65">0°05'57.3&quot;S · 37°34'52.4&quot;E</span>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-slate-200">
            © OpenStreetMap contributors
          </div>
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="absolute right-3 top-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-[#061229] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#D89B28] dark:bg-slate-900 dark:text-white">
            <Navigation size={14} aria-hidden="true" />
            View in Google Maps
          </a>
        </div>
      </div>
    </section>
  );
}
