const apiRoutes = {
  global: "/api/jobs?mode=global",
  country: (countryCode) => `/api/jobs?mode=country&country=${encodeURIComponent(countryCode)}`,
  city: (countryCode, city) => `/api/jobs?mode=city&country=${encodeURIComponent(countryCode)}&city=${encodeURIComponent(city)}`,
  jobs: (q, postedWithin = null) => {
    const params = new URLSearchParams({ mode: "jobs", q: q || "React" });
    if (postedWithin) params.set("postedWithin", postedWithin);
    return `/api/jobs?${params.toString()}`;
  },
  detail: (id) => `/api/jobs?mode=detail&id=${encodeURIComponent(id)}`
};

const DEMO_NOW = new Date("2026-04-27T15:00:00-04:00");

const postedWithinHours = {
  "1h": 1,
  "6h": 6,
  "1d": 24,
  "7d": 24 * 7,
  "30d": 24 * 30
};

const countries = [
  { countryCode: "US", countryName: "United States", latitude: 39.8, longitude: -98.6, jobCount: 184200, topCategories: ["Software", "AI / ML", "Product"], topMetroAreas: ["New York", "San Francisco", "Seattle", "Austin", "Boston"] },
  { countryCode: "GB", countryName: "United Kingdom", latitude: 54.7, longitude: -2.6, jobCount: 68200, topCategories: ["Data", "Cybersecurity", "Design"], topMetroAreas: ["London", "Manchester", "Cambridge", "Bristol", "Edinburgh"] },
  { countryCode: "DE", countryName: "Germany", latitude: 51.1, longitude: 10.4, jobCount: 72100, topCategories: ["Cloud", "Software", "Product"], topMetroAreas: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"] },
  { countryCode: "IN", countryName: "India", latitude: 22.9, longitude: 78.9, jobCount: 116400, topCategories: ["Software", "Cloud", "Data"], topMetroAreas: ["Bengaluru", "Hyderabad", "Pune", "Delhi NCR", "Mumbai"] },
  { countryCode: "SG", countryName: "Singapore", latitude: 1.35, longitude: 103.82, jobCount: 24400, topCategories: ["AI / ML", "Finance Tech", "Cybersecurity"], topMetroAreas: ["Singapore Core", "Jurong", "Tampines", "Paya Lebar", "One North"] },
  { countryCode: "AU", countryName: "Australia", latitude: -25.3, longitude: 133.8, jobCount: 39100, topCategories: ["Data", "Software", "Design"], topMetroAreas: ["Sydney", "Melbourne", "Brisbane", "Perth", "Canberra"] },
  { countryCode: "CA", countryName: "Canada", latitude: 56.1, longitude: -106.3, jobCount: 51200, topCategories: ["AI / ML", "Cloud", "Software"], topMetroAreas: ["Toronto", "Vancouver", "Montreal", "Waterloo", "Calgary"] },
  { countryCode: "BR", countryName: "Brazil", latitude: -14.2, longitude: -51.9, jobCount: 28600, topCategories: ["Software", "Data", "Design"], topMetroAreas: ["Sao Paulo", "Rio de Janeiro", "Florianopolis", "Curitiba", "Belo Horizonte"] },
  { countryCode: "JP", countryName: "Japan", latitude: 36.2, longitude: 138.3, jobCount: 41700, topCategories: ["Robotics", "AI / ML", "Software"], topMetroAreas: ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Fukuoka"] }
];

const cities = [
  { city: "New York", countryCode: "US", countryName: "United States", latitude: 40.7128, longitude: -74.006, jobCount: 41200, topCategories: ["Software", "Product", "Data"] },
  { city: "San Francisco", countryCode: "US", countryName: "United States", latitude: 37.7749, longitude: -122.4194, jobCount: 38700, topCategories: ["AI / ML", "Software", "Design"] },
  { city: "Seattle", countryCode: "US", countryName: "United States", latitude: 47.6062, longitude: -122.3321, jobCount: 24400, topCategories: ["Cloud", "AI / ML", "Product"] },
  { city: "Austin", countryCode: "US", countryName: "United States", latitude: 30.2672, longitude: -97.7431, jobCount: 19300, topCategories: ["Software", "Cybersecurity", "Design"] },
  { city: "Boston", countryCode: "US", countryName: "United States", latitude: 42.3601, longitude: -71.0589, jobCount: 17400, topCategories: ["AI / ML", "Data", "BioTech"] },
  { city: "London", countryCode: "GB", countryName: "United Kingdom", latitude: 51.5072, longitude: -0.1276, jobCount: 33100, topCategories: ["Data", "Product", "Cybersecurity"] },
  { city: "Berlin", countryCode: "DE", countryName: "Germany", latitude: 52.52, longitude: 13.405, jobCount: 24600, topCategories: ["Cloud", "Product", "Software"] },
  { city: "Bengaluru", countryCode: "IN", countryName: "India", latitude: 12.9716, longitude: 77.5946, jobCount: 45200, topCategories: ["Software", "Cloud", "AI / ML"] },
  { city: "Singapore Core", countryCode: "SG", countryName: "Singapore", latitude: 1.29, longitude: 103.85, jobCount: 18300, topCategories: ["AI / ML", "Finance Tech", "Data"] },
  { city: "Sydney", countryCode: "AU", countryName: "Australia", latitude: -33.8688, longitude: 151.2093, jobCount: 18800, topCategories: ["Software", "Data", "Design"] },
  { city: "Toronto", countryCode: "CA", countryName: "Canada", latitude: 43.6532, longitude: -79.3832, jobCount: 21100, topCategories: ["AI / ML", "Cloud", "Software"] },
  { city: "Sao Paulo", countryCode: "BR", countryName: "Brazil", latitude: -23.5558, longitude: -46.6396, jobCount: 16400, topCategories: ["Software", "Data", "Design"] },
  { city: "Tokyo", countryCode: "JP", countryName: "Japan", latitude: 35.6762, longitude: 139.6503, jobCount: 22900, topCategories: ["AI / ML", "Robotics", "Software"] }
];

const companies = [
  { id: "northstar", companyName: "Northstar AI", logoUrl: "", city: "New York", countryCode: "US", latitude: 40.741, longitude: -73.989, jobCount: 128, topCategory: "AI / ML", size: "lg" },
  { id: "atlas", companyName: "Atlas Systems", logoUrl: "", city: "New York", countryCode: "US", latitude: 40.705, longitude: -74.012, jobCount: 64, topCategory: "Cloud", size: "md" },
  { id: "signalgrid", companyName: "SignalGrid", logoUrl: "", city: "New York", countryCode: "US", latitude: 40.759, longitude: -73.984, jobCount: 42, topCategory: "Product", size: "md" },
  { id: "civicbyte", companyName: "CivicByte", logoUrl: "", city: "New York", countryCode: "US", latitude: 40.718, longitude: -73.998, jobCount: 21, topCategory: "Design", size: "sm" },
  { id: "harbor", companyName: "Harbor Security", logoUrl: "", city: "New York", countryCode: "US", latitude: 40.752, longitude: -74.002, jobCount: 33, topCategory: "Cybersecurity", size: "sm" },
  { id: "aurora", companyName: "Aurora Labs", logoUrl: "", city: "San Francisco", countryCode: "US", latitude: 37.781, longitude: -122.404, jobCount: 94, topCategory: "AI / ML", size: "lg" },
  { id: "raincity", companyName: "Raincity Cloud", logoUrl: "", city: "Seattle", countryCode: "US", latitude: 47.61, longitude: -122.333, jobCount: 88, topCategory: "Cloud", size: "lg" },
  { id: "one-north", companyName: "One North Data", logoUrl: "", city: "Singapore Core", countryCode: "SG", latitude: 1.304, longitude: 103.79, jobCount: 52, topCategory: "Data", size: "md" },
  { id: "thames", companyName: "Thames Intelligence", logoUrl: "", city: "London", countryCode: "GB", latitude: 51.515, longitude: -0.092, jobCount: 73, topCategory: "Data", size: "lg" },
  { id: "spree", companyName: "Spree Cloudworks", logoUrl: "", city: "Berlin", countryCode: "DE", latitude: 52.512, longitude: 13.39, jobCount: 46, topCategory: "Cloud", size: "md" },
  { id: "nandi", companyName: "Nandi Systems", logoUrl: "", city: "Bengaluru", countryCode: "IN", latitude: 12.976, longitude: 77.601, jobCount: 119, topCategory: "Software", size: "lg" },
  { id: "harbour-ai", companyName: "Harbour AI", logoUrl: "", city: "Sydney", countryCode: "AU", latitude: -33.865, longitude: 151.205, jobCount: 39, topCategory: "AI / ML", size: "sm" },
  { id: "maplecore", companyName: "MapleCore", logoUrl: "", city: "Toronto", countryCode: "CA", latitude: 43.647, longitude: -79.381, jobCount: 58, topCategory: "Cloud", size: "md" },
  { id: "paulista", companyName: "Paulista Digital", logoUrl: "", city: "Sao Paulo", countryCode: "BR", latitude: -23.561, longitude: -46.656, jobCount: 37, topCategory: "Software", size: "sm" },
  { id: "shibuya", companyName: "Shibuya Robotics", logoUrl: "", city: "Tokyo", countryCode: "JP", latitude: 35.659, longitude: 139.7, jobCount: 69, topCategory: "Robotics", size: "md" }
];

const jobMarkers = [
  { id: "marker-001", jobId: "demo-job-001", companyId: "northstar", label: "Principal React Engineer", latitude: 40.741, longitude: -73.989, roleSnippet: "Own globe-scale search surfaces and AI-assisted workflows.", salaryHint: "$190k-$240k", remoteMode: "Hybrid" },
  { id: "marker-002", jobId: "demo-job-002", companyId: "northstar", label: "ML Product Engineer", latitude: 40.748, longitude: -73.979, roleSnippet: "Ship ranking UX for job-market intelligence models.", salaryHint: "$175k-$220k", remoteMode: "Remote" },
  { id: "marker-003", jobId: "demo-job-003", companyId: "atlas", label: "Cloud Platform Lead", latitude: 40.705, longitude: -74.012, roleSnippet: "Build resilient ingestion for hiring demand pipelines.", salaryHint: "$165k-$210k", remoteMode: "Hybrid" },
  { id: "marker-004", jobId: "demo-job-004", companyId: "signalgrid", label: "Senior Product Designer", latitude: 40.759, longitude: -73.984, roleSnippet: "Design dense operator tools for global talent teams.", salaryHint: "$155k-$195k", remoteMode: "On-site" },
  { id: "marker-005", jobId: "demo-job-005", companyId: "harbor", label: "Security Data Engineer", latitude: 40.752, longitude: -74.002, roleSnippet: "Model threat signals across enterprise hiring workflows.", salaryHint: "$150k-$188k", remoteMode: "Hybrid" },
  { id: "marker-006", jobId: "demo-job-006", companyId: "aurora", label: "AI Frontend Architect", latitude: 37.781, longitude: -122.404, roleSnippet: "Craft high-performance visualization systems for model teams.", salaryHint: "$205k-$260k", remoteMode: "Remote" },
  { id: "marker-007", jobId: "demo-job-007", companyId: "thames", label: "Data Product Lead", latitude: 51.515, longitude: -0.092, roleSnippet: "Shape executive hiring intelligence for financial services teams.", salaryHint: "GBP 115k-145k", remoteMode: "Hybrid" },
  { id: "marker-008", jobId: "demo-job-008", companyId: "spree", label: "Staff Cloud Engineer", latitude: 52.512, longitude: 13.39, roleSnippet: "Scale geospatial APIs and event pipelines across Europe.", salaryHint: "EUR 105k-132k", remoteMode: "Remote" },
  { id: "marker-009", jobId: "demo-job-009", companyId: "nandi", label: "Senior Backend Engineer", latitude: 12.976, longitude: 77.601, roleSnippet: "Build search indexing and ranking services for talent graphs.", salaryHint: "INR 58L-82L", remoteMode: "Hybrid" },
  { id: "marker-010", jobId: "demo-job-010", companyId: "harbour-ai", label: "Applied AI Designer", latitude: -33.865, longitude: 151.205, roleSnippet: "Design explainable AI workflows for job matching and prep.", salaryHint: "A$150k-A$185k", remoteMode: "Remote" },
  { id: "marker-011", jobId: "demo-job-011", companyId: "maplecore", label: "Platform Reliability Engineer", latitude: 43.647, longitude: -79.381, roleSnippet: "Harden distributed systems behind live hiring telemetry.", salaryHint: "C$155k-C$190k", remoteMode: "Hybrid" },
  { id: "marker-012", jobId: "demo-job-012", companyId: "paulista", label: "Frontend Data Viz Engineer", latitude: -23.561, longitude: -46.656, roleSnippet: "Create dense dashboards for regional market comparisons.", salaryHint: "R$300k-R$390k", remoteMode: "Remote" },
  { id: "marker-013", jobId: "demo-job-013", companyId: "shibuya", label: "Robotics ML Engineer", latitude: 35.659, longitude: 139.7, roleSnippet: "Connect robotics hiring signals to skill and role ontologies.", salaryHint: "JPY 18M-23M", remoteMode: "On-site" }
];

const jobs = [
  { id: "demo-job-001", title: "Principal React Engineer", companyName: "Northstar AI", location: "New York, US", category: "Software", employmentType: "Full-time", remoteMode: "Hybrid", salaryRange: "$190k-$240k", postedAt: "2026-04-27T14:25:00-04:00", postedDate: "2026-04-27", freshness: "35 minutes ago", summary: "Lead the frontend architecture for a high-performance job intelligence map with streaming search, ranking explanations, and accessible data exploration.", applyUrl: "https://example.com/apply/demo-job-001", requiredSkills: ["React", "TypeScript", "WebGL", "Accessibility"] },
  { id: "demo-job-002", title: "ML Product Engineer", companyName: "Northstar AI", location: "New York, US", category: "AI / ML", employmentType: "Full-time", remoteMode: "Remote", salaryRange: "$175k-$220k", postedAt: "2026-04-27T11:40:00-04:00", postedDate: "2026-04-27", freshness: "3 hours ago", summary: "Prototype ranking and recommendation experiences that explain why jobs match a candidate profile.", applyUrl: "https://example.com/apply/demo-job-002", requiredSkills: ["Python", "Ranking", "React", "Experimentation"] },
  { id: "demo-job-003", title: "Cloud Platform Lead", companyName: "Atlas Systems", location: "New York, US", category: "Cloud", employmentType: "Full-time", remoteMode: "Hybrid", salaryRange: "$165k-$210k", postedAt: "2026-04-26T16:10:00-04:00", postedDate: "2026-04-26", freshness: "23 hours ago", summary: "Own the platform behind real-time job ingestion, dedupe, geo enrichment, and search indexing.", applyUrl: "https://example.com/apply/demo-job-003", requiredSkills: ["Kubernetes", "Kafka", "Postgres", "Observability"] },
  { id: "demo-job-004", title: "Senior Product Designer", companyName: "SignalGrid", location: "New York, US", category: "Design", employmentType: "Contract", remoteMode: "On-site", salaryRange: "$110/hr-$145/hr", postedAt: "2026-04-25T09:15:00-04:00", postedDate: "2026-04-25", freshness: "2 days ago", summary: "Design professional geospatial dashboards for recruiters and job seekers comparing markets, salaries, and company demand.", applyUrl: "https://example.com/apply/demo-job-004", requiredSkills: ["Figma", "Data Visualization", "Research", "Design Systems"] },
  { id: "demo-job-005", title: "Security Data Engineer", companyName: "Harbor Security", location: "New York, US", category: "Cybersecurity", employmentType: "Full-time", remoteMode: "Hybrid", salaryRange: "$150k-$188k", postedAt: "2026-04-21T13:30:00-04:00", postedDate: "2026-04-21", freshness: "6 days ago", summary: "Build privacy-conscious data products that surface trusted employer signals and risky listings.", applyUrl: "https://example.com/apply/demo-job-005", requiredSkills: ["Python", "Security", "ETL", "Data Quality"] },
  { id: "demo-job-006", title: "AI Frontend Architect", companyName: "Aurora Labs", location: "San Francisco, US", category: "AI / ML", employmentType: "Full-time", remoteMode: "Remote", salaryRange: "$205k-$260k", postedAt: "2026-04-20T10:00:00-04:00", postedDate: "2026-04-20", freshness: "7 days ago", summary: "Create interactive model observability and job-market visualization surfaces for technical users.", applyUrl: "https://example.com/apply/demo-job-006", requiredSkills: ["WebGL", "React", "TypeScript", "AI UX"] },
  { id: "demo-job-007", title: "Data Product Lead", companyName: "Thames Intelligence", location: "London, GB", category: "Data", employmentType: "Full-time", remoteMode: "Hybrid", salaryRange: "GBP 115k-145k", postedAt: "2026-04-27T09:30:00-04:00", postedDate: "2026-04-27", freshness: "5.5 hours ago", summary: "Lead market intelligence products that help teams understand demand, scarcity, and compensation by region.", applyUrl: "https://example.com/apply/demo-job-007", requiredSkills: ["Analytics", "Product Strategy", "SQL", "Stakeholder Management"] },
  { id: "demo-job-008", title: "Staff Cloud Engineer", companyName: "Spree Cloudworks", location: "Berlin, DE", category: "Cloud", employmentType: "Full-time", remoteMode: "Remote", salaryRange: "EUR 105k-132k", postedAt: "2026-04-24T08:45:00-04:00", postedDate: "2026-04-24", freshness: "3 days ago", summary: "Scale geospatial APIs, worker queues, and observability for a European hiring graph.", applyUrl: "https://example.com/apply/demo-job-008", requiredSkills: ["Kubernetes", "Go", "Postgres", "OpenTelemetry"] },
  { id: "demo-job-009", title: "Senior Backend Engineer", companyName: "Nandi Systems", location: "Bengaluru, IN", category: "Software", employmentType: "Full-time", remoteMode: "Hybrid", salaryRange: "INR 58L-82L", postedAt: "2026-04-23T12:20:00-04:00", postedDate: "2026-04-23", freshness: "4 days ago", summary: "Build search indexing, role normalization, and ranking services for high-volume job discovery.", applyUrl: "https://example.com/apply/demo-job-009", requiredSkills: ["Java", "Search", "Kafka", "Distributed Systems"] },
  { id: "demo-job-010", title: "Applied AI Designer", companyName: "Harbour AI", location: "Sydney, AU", category: "Design", employmentType: "Contract", remoteMode: "Remote", salaryRange: "A$150k-A$185k", postedAt: "2026-04-26T22:05:00-04:00", postedDate: "2026-04-26", freshness: "17 hours ago", summary: "Design trustworthy AI explanations for job matching, interview prep, and salary confidence.", applyUrl: "https://example.com/apply/demo-job-010", requiredSkills: ["AI UX", "Figma", "Research", "Prototyping"] },
  { id: "demo-job-011", title: "Platform Reliability Engineer", companyName: "MapleCore", location: "Toronto, CA", category: "Cloud", employmentType: "Full-time", remoteMode: "Hybrid", salaryRange: "C$155k-C$190k", postedAt: "2026-04-12T15:00:00-04:00", postedDate: "2026-04-12", freshness: "15 days ago", summary: "Keep real-time hiring telemetry, enrichment, and map rendering services fast and resilient.", applyUrl: "https://example.com/apply/demo-job-011", requiredSkills: ["SRE", "Kubernetes", "Incident Response", "Terraform"] },
  { id: "demo-job-012", title: "Frontend Data Viz Engineer", companyName: "Paulista Digital", location: "Sao Paulo, BR", category: "Software", employmentType: "Full-time", remoteMode: "Remote", salaryRange: "R$300k-R$390k", postedAt: "2026-04-04T12:00:00-04:00", postedDate: "2026-04-04", freshness: "23 days ago", summary: "Build responsive dashboards for regional job density, salary bands, and company movement.", applyUrl: "https://example.com/apply/demo-job-012", requiredSkills: ["React", "D3", "TypeScript", "Accessibility"] },
  { id: "demo-job-013", title: "Robotics ML Engineer", companyName: "Shibuya Robotics", location: "Tokyo, JP", category: "AI / ML", employmentType: "Full-time", remoteMode: "On-site", salaryRange: "JPY 18M-23M", postedAt: "2026-03-20T11:10:00-04:00", postedDate: "2026-03-20", freshness: "38 days ago", summary: "Model robotics hiring demand and map skill requirements across advanced manufacturing teams.", applyUrl: "https://example.com/apply/demo-job-013", requiredSkills: ["Machine Learning", "Robotics", "Python", "MLOps"] }
];

const state = {
  layer: "global",
  selectedCountry: "US",
  selectedCity: "New York",
  selectedJobId: null,
  is2d: false,
  listMode: false,
  zoom: 1,
  targetZoom: 1,
  zoomAnimationFrame: null,
  globeCenterLon: -18,
  isDragging: false,
  activePointers: new Map(),
  pinchStartDistance: 0,
  pinchStartZoom: 1,
  dragStartX: 0,
  dragStartY: 0,
  dragStartLon: -18,
  panX: 0,
  panY: 0,
  dragStartPanX: 0,
  dragStartPanY: 0,
  filters: {
    q: "",
    category: "all",
    place: "global",
    remote: "all",
    type: "all",
    postedWithin: null
  }
};

const zoomBounds = {
  min: 0.72,
  max: 1.24
};

const els = {
  form: document.querySelector("#filterForm"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  placeFilter: document.querySelector("#placeFilter"),
  remoteFilter: document.querySelector("#remoteFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  postedWithinFilter: document.querySelector("#postedWithinFilter"),
  layerButtons: [...document.querySelectorAll("[data-layer]")],
  mapViewport: document.querySelector(".map-viewport"),
  markerLayer: document.querySelector("#markerLayer"),
  mapStage: document.querySelector("#mapStage"),
  globeCore: document.querySelector(".globe-core"),
  fallbackToggle: document.querySelector("#fallbackToggle"),
  listModeToggle: document.querySelector("#listModeToggle"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomResetButton: document.querySelector("#zoomResetButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  jobsListPanel: document.querySelector("#jobsListPanel"),
  closeListButton: document.querySelector("#closeListButton"),
  jobsList: document.querySelector("#jobsList"),
  summaryTitle: document.querySelector("#summaryTitle"),
  summaryCopy: document.querySelector("#summaryCopy"),
  summaryJobs: document.querySelector("#summaryJobs"),
  summaryVelocity: document.querySelector("#summaryVelocity"),
  categoryChips: document.querySelector("#categoryChips"),
  metroList: document.querySelector("#metroList"),
  endpointText: document.querySelector("#endpointText"),
  breadcrumbText: document.querySelector("#breadcrumbText"),
  resultCount: document.querySelector("#resultCount"),
  emptyJobState: document.querySelector("#emptyJobState"),
  jobDetail: document.querySelector("#jobDetail"),
  closePanelButton: document.querySelector("#closePanelButton"),
  detailFreshness: document.querySelector("#detailFreshness"),
  detailTitle: document.querySelector("#detailTitle"),
  detailCompany: document.querySelector("#detailCompany"),
  detailTags: document.querySelector("#detailTags"),
  detailSummary: document.querySelector("#detailSummary"),
  applyLink: document.querySelector("#applyLink"),
  saveJobButton: document.querySelector("#saveJobButton"),
  prepList: document.querySelector("#prepList"),
  matchCopy: document.querySelector("#matchCopy"),
  canvas: document.querySelector("#ambientCanvas")
};

function projectFlat(longitude, latitude) {
  return {
    x: ((longitude + 180) / 360) * 100,
    y: ((90 - latitude) / 180) * 100,
    visible: true,
    depth: 1
  };
}

function projectGlobe(longitude, latitude) {
  const lat = (latitude * Math.PI) / 180;
  const lon = (normalizeDelta(longitude - state.globeCenterLon) * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  const x = cosLat * Math.sin(lon);
  const y = Math.sin(lat);
  const z = cosLat * Math.cos(lon);
  return {
    x: 50 + x * 43,
    y: 50 - y * 39,
    visible: z > -0.08,
    depth: Math.max(0, z)
  };
}

function project(longitude, latitude) {
  return state.is2d ? projectFlat(longitude, latitude) : projectGlobe(longitude, latitude);
}

function densityClass(ratio) {
  if (ratio >= 0.78) return "density-peak";
  if (ratio >= 0.48) return "density-high";
  if (ratio >= 0.25) return "density-mid";
  return "density-low";
}

function densitySize(base, spread, ratio) {
  return `${Math.round(base + spread * Math.sqrt(ratio))}px`;
}

function cityAbbr(city) {
  const aliases = {
    "New York": "NYC",
    "San Francisco": "SF",
    "Seattle": "SEA",
    "Austin": "ATX",
    "Boston": "BOS",
    "London": "LDN",
    "Berlin": "BER",
    "Bengaluru": "BLR",
    "Singapore Core": "SG",
    "Sydney": "SYD",
    "Toronto": "TOR",
    "Sao Paulo": "SP",
    "Tokyo": "TYO"
  };
  return aliases[city] || city.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

const cityLabelOffsets = {
  "Seattle": { x: "8px", y: "-9px" },
  "San Francisco": { x: "10px", y: "7px" },
  "Austin": { x: "-2px", y: "16px" },
  "New York": { x: "-17px", y: "9px" },
  "Boston": { x: "-8px", y: "-11px" }
};

const companyMarkerOffsets = {
  northstar: { x: "0px", y: "-10px" },
  atlas: { x: "-12px", y: "8px" },
  signalgrid: { x: "13px", y: "-4px" },
  civicbyte: { x: "10px", y: "12px" },
  harbor: { x: "-10px", y: "-5px" }
};

function setGlobeCenter(longitude) {
  state.globeCenterLon += normalizeDelta(longitude - state.globeCenterLon);
  updateProjection();
}

function focusGlobe(longitude, preferredZoom = state.targetZoom) {
  state.globeCenterLon += normalizeDelta(longitude - state.globeCenterLon);
  setZoom(Math.max(state.targetZoom, preferredZoom));
}

function normalizeDelta(value) {
  return ((value + 540) % 360) - 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function pointerDistance(points) {
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function formatCount(value) {
  return value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value);
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function getCountry(code = state.selectedCountry) {
  return countries.find((country) => country.countryCode === code) || countries[0];
}

function getCitiesForCountry(code = state.selectedCountry) {
  return cities.filter((city) => city.countryCode === code);
}

function getCompaniesForCity(cityName = state.selectedCity) {
  return companies.filter((company) => company.city === cityName);
}

function getJobsForCity(cityName = state.selectedCity) {
  const companyIds = new Set(getCompaniesForCity(cityName).map((company) => company.id));
  return jobMarkers.filter((marker) => companyIds.has(marker.companyId));
}

function withPostedWithin(route) {
  const value = state.filters.postedWithin;
  if (!value || route.includes("postedWithin=")) return route;
  return `${route}${route.includes("?") ? "&" : "?"}postedWithin=${encodeURIComponent(value)}`;
}

function postedWithinMatch(job) {
  const value = state.filters.postedWithin;
  if (!value) return true;
  const hours = postedWithinHours[value];
  if (!hours || !job.postedAt) return true;
  const postedAt = new Date(job.postedAt);
  const ageHours = (DEMO_NOW.getTime() - postedAt.getTime()) / 3600000;
  return ageHours >= 0 && ageHours <= hours;
}

function filterJobs(jobList = jobs) {
  return jobList.filter((job) => {
    const q = state.filters.q.trim().toLowerCase();
    const placeMatch = state.filters.place === "global" || job.location.includes(state.filters.place);
    const qMatch = !q || [job.title, job.companyName, job.location, job.category, job.summary, ...job.requiredSkills].join(" ").toLowerCase().includes(q);
    const categoryMatch = state.filters.category === "all" || job.category === state.filters.category;
    const remoteMatch = state.filters.remote === "all" || job.remoteMode === state.filters.remote;
    const typeMatch = state.filters.type === "all" || job.employmentType === state.filters.type;
    const postedMatch = postedWithinMatch(job);
    return qMatch && categoryMatch && remoteMatch && typeMatch && placeMatch && postedMatch;
  });
}

async function mockApi(route) {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  if (route.includes("mode=global")) return countries;
  if (route.includes("mode=country")) return getCitiesForCountry(state.selectedCountry);
  if (route.includes("mode=city")) return getCompaniesForCity(state.selectedCity);
  if (route.includes("mode=detail")) return jobs.find((job) => route.includes(job.id));
  return filterJobs();
}

function markerButton({ className, latitude, longitude, size, density = 0.35, projection = "geo", localX = null, localY = null, offsetX = "0px", offsetY = "0px", label, tooltip, onClick, active = false }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `marker ${className} ${densityClass(density)}${active ? " is-active" : ""}`;
  button.dataset.lat = String(latitude);
  button.dataset.lon = String(longitude);
  button.dataset.density = String(density);
  button.dataset.projection = projection;
  if (localX !== null) button.dataset.localX = String(localX);
  if (localY !== null) button.dataset.localY = String(localY);
  button.style.setProperty("--size", size);
  button.style.setProperty("--label-offset-x", offsetX);
  button.style.setProperty("--label-offset-y", offsetY);
  button.dataset.tooltip = tooltip;
  button.innerHTML = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderMarkers(items) {
  els.markerLayer.replaceChildren(...items);
  els.resultCount.textContent = `${items.length} plotted signals`;
  updateProjection();
}

function updateProjection() {
  const texturePosition = (2 * ((state.globeCenterLon + 180) / 360) - 0.5) * 100;
  const bg = `${texturePosition}%`;
  els.globeCore.style.setProperty("--globe-bg-x", bg);
  els.mapViewport.style.setProperty("--map-zoom", String(state.zoom));
  els.mapViewport.style.setProperty("--pan-x", `${state.is2d ? state.panX : 0}px`);
  els.mapViewport.style.setProperty("--pan-y", `${state.is2d ? state.panY : 0}px`);
  [...els.markerLayer.children].forEach((marker) => {
    const longitude = Number(marker.dataset.lon);
    const latitude = Number(marker.dataset.lat);
    const point = marker.dataset.projection === "local" && marker.dataset.localX
      ? { x: Number(marker.dataset.localX), y: Number(marker.dataset.localY), visible: true, depth: 1 }
      : marker.dataset.projection === "local"
        ? projectLocal(longitude, latitude)
        : project(longitude, latitude);
    marker.style.setProperty("--x", `${point.x}%`);
    marker.style.setProperty("--y", `${point.y}%`);
    marker.style.zIndex = String(Math.round(point.depth * 100));
    marker.classList.toggle("is-behind", !state.is2d && !point.visible);
  });
  els.zoomResetButton.textContent = `${Math.round(state.zoom * 100)}%`;
}

function projectLocal(longitude, latitude) {
  const city = cities.find((row) => row.city === state.selectedCity);
  if (!city) return project(longitude, latitude);
  const base = state.is2d ? projectFlat(city.longitude, city.latitude) : projectGlobe(city.longitude, city.latitude);
  if (!state.is2d && !base.visible) return base;
  const cityAnchorOffsets = {
    "New York": { x: -7, y: 10 },
    "San Francisco": { x: 5, y: 1 },
    "Seattle": { x: 5, y: 2 },
    "Singapore Core": { x: -3, y: 0 }
  };
  const anchor = cityAnchorOffsets[city.city] || { x: 0, y: 0 };
  const x = base.x + anchor.x + (longitude - city.longitude) * 120;
  const y = base.y + anchor.y - (latitude - city.latitude) * 140;
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(88, Math.max(12, y)),
    visible: true,
    depth: base.depth
  };
}

function clampPan(nextZoom = state.zoom) {
  const rect = els.mapViewport.getBoundingClientRect();
  const mapWidth = Math.min(rect.width * 0.94, 1200);
  const mapHeight = mapWidth / 2;
  const maxX = Math.max(90, (mapWidth * nextZoom - rect.width) / 2 + 120);
  const maxY = Math.max(70, (mapHeight * nextZoom - rect.height) / 2 + 90);
  state.panX = clamp(state.panX, -maxX, maxX);
  state.panY = clamp(state.panY, -maxY, maxY);
}

function setZoom(nextZoom, anchor = null) {
  const previousZoom = state.zoom;
  const resolvedZoom = clamp(nextZoom, zoomBounds.min, zoomBounds.max);
  const startZoom = state.zoom;
  const startTime = performance.now();
  const duration = 260;

  state.targetZoom = resolvedZoom;

  if (state.is2d && anchor) {
    const rect = els.mapViewport.getBoundingClientRect();
    const originX = anchor.clientX - (rect.left + rect.width / 2);
    const originY = anchor.clientY - (rect.top + rect.height / 2);
    state.panX = originX - ((originX - state.panX) / previousZoom) * resolvedZoom;
    state.panY = originY - ((originY - state.panY) / previousZoom) * resolvedZoom;
  }

  if (state.zoomAnimationFrame) {
    window.cancelAnimationFrame(state.zoomAnimationFrame);
  }

  function step(now) {
    const progress = clamp((now - startTime) / duration, 0, 1);
    state.zoom = startZoom + (resolvedZoom - startZoom) * easeOutCubic(progress);
    if (state.is2d) clampPan(state.zoom);
    updateProjection();

    if (progress < 1) {
      state.zoomAnimationFrame = window.requestAnimationFrame(step);
      return;
    }

    state.zoom = resolvedZoom;
    state.zoomAnimationFrame = null;
    if (state.is2d) clampPan(resolvedZoom);
    updateProjection();
  }

  state.zoomAnimationFrame = window.requestAnimationFrame(step);
}

function resetZoom() {
  state.panX = 0;
  state.panY = 0;
  setZoom(1);
}

function renderGlobal() {
  const max = Math.max(...countries.map((country) => country.jobCount));
  const markers = countries.map((country) => {
    const ratio = country.jobCount / max;
    return markerButton({
      className: "marker-country",
      latitude: country.latitude,
      longitude: country.longitude,
      size: densitySize(24, 27, ratio),
      density: ratio,
      label: `<span>${country.countryCode}</span><small>${formatCount(country.jobCount)}</small>`,
      tooltip: `${country.countryName} | ${country.jobCount.toLocaleString()} open jobs | ${country.topCategories.join(", ")}`,
      onClick: () => {
        state.selectedCountry = country.countryCode;
        state.filters.place = country.countryCode;
        els.placeFilter.value = country.countryCode;
        focusGlobe(country.longitude, 1.14);
        setLayer("country");
      }
    });
  });
  renderMarkers(markers);
  setSummary({
    title: "Global hiring demand",
    copy: "Country-level density reveals where hiring pressure is strongest. Click a country to inspect metro demand.",
    jobs: countries.reduce((sum, country) => sum + country.jobCount, 0),
    categories: ["Software", "AI / ML", "Cloud", "Data", "Cybersecurity"],
    metros: countries.slice(0, 5).map((country) => ({ name: country.countryName, count: country.jobCount, code: country.countryCode })),
    endpoint: apiRoutes.global,
    breadcrumb: "Global demand layer"
  });
}

function renderCountry() {
  const country = getCountry();
  setGlobeCenter(country.longitude);
  const cityRows = getCitiesForCountry(country.countryCode);
  const max = Math.max(...cityRows.map((city) => city.jobCount), 1);
  const markers = cityRows.map((city) => {
    const ratio = city.jobCount / max;
    const offset = cityLabelOffsets[city.city] || { x: "0px", y: "0px" };
    return markerButton({
      className: "marker-city",
      latitude: city.latitude,
      longitude: city.longitude,
      size: densitySize(18, 14, ratio),
      density: ratio,
      offsetX: offset.x,
      offsetY: offset.y,
      label: `<span>${cityAbbr(city.city)}</span><small>${formatCount(city.jobCount)}</small>`,
      tooltip: `${city.city} | ${city.jobCount.toLocaleString()} jobs | ${city.topCategories.join(", ")}`,
      onClick: () => {
        state.selectedCity = city.city;
        focusGlobe(city.longitude, 1.28);
        setLayer("city");
      }
    });
  });
  renderMarkers(markers);
  setSummary({
    title: `${country.countryName} demand`,
    copy: `${country.jobCount.toLocaleString()} open roles across the market. Top metros are plotted by current posting volume.`,
    jobs: country.jobCount,
    categories: country.topCategories,
    metros: cityRows.map((city) => ({ name: city.city, count: city.jobCount })),
    endpoint: apiRoutes.country(country.countryCode),
    breadcrumb: `${country.countryName} country layer`
  });
}

function renderCity() {
  const companyRows = getCompaniesForCity();
  const city = cities.find((row) => row.city === state.selectedCity) || getCitiesForCountry()[0];
  if (city) setGlobeCenter(city.longitude);
  const sizeMap = { sm: "24px", md: "30px", lg: "38px" };
  const max = Math.max(...companyRows.map((company) => company.jobCount), 1);
  const markers = companyRows.map((company) => {
    const ratio = company.jobCount / max;
    const offset = companyMarkerOffsets[company.id] || { x: "0px", y: "0px" };
    return markerButton({
      className: "marker-company",
      latitude: company.latitude,
      longitude: company.longitude,
      projection: "local",
      size: sizeMap[company.size] || sizeMap.md,
      density: ratio,
      offsetX: offset.x,
      offsetY: offset.y,
      label: `<span>${initials(company.companyName)}</span>`,
      tooltip: `${company.companyName} | ${company.jobCount} open jobs | ${company.topCategory}`,
      onClick: () => {
        focusGlobe(company.longitude, 1.38);
        setLayer("neighbourhood");
      }
    });
  });
  renderMarkers(markers);
  setSummary({
    title: `${state.selectedCity} company demand`,
    copy: "Company bubbles are sized by current posting count. Select a bubble to expose precise job markers.",
    jobs: city?.jobCount || companyRows.reduce((sum, company) => sum + company.jobCount, 0),
    categories: city?.topCategories || ["Software", "AI / ML", "Product"],
    metros: companyRows.map((company) => ({ name: company.companyName, count: company.jobCount })),
    endpoint: apiRoutes.city(state.selectedCountry, state.selectedCity),
    breadcrumb: `${state.selectedCity} city layer`
  });
}

function renderNeighbourhood() {
  const markerRows = getJobsForCity();
  const city = cities.find((row) => row.city === state.selectedCity);
  if (city) setGlobeCenter(city.longitude);
  const visibleJobs = filterJobs(jobs);
  const visibleIds = new Set(visibleJobs.map((job) => job.id));
  const cityMarkers = markerRows.filter((marker) => visibleIds.has(marker.jobId));
  const markers = cityMarkers.map((marker) => {
    return markerButton({
      className: "marker-job",
      latitude: marker.latitude,
      longitude: marker.longitude,
      projection: "local",
      size: "16px",
      density: 0.82,
      active: marker.jobId === state.selectedJobId,
      label: `<span>${marker.label}</span>`,
      tooltip: `${marker.label} | ${marker.salaryHint} | ${marker.remoteMode} | ${marker.roleSnippet}`,
      onClick: () => openJob(marker.jobId)
    });
  });
  renderMarkers(markers);
  setSummary({
    title: `${state.selectedCity} role signals`,
    copy: "Precise job/company markers expose role snippets, salary hints, and remote mode before opening details.",
    jobs: markers.length,
    categories: [...new Set(visibleJobs.map((job) => job.category))],
    metros: visibleJobs.map((job) => ({ name: job.title, count: job.salaryRange })),
    endpoint: apiRoutes.jobs(state.filters.q || "React", state.filters.postedWithin),
    breadcrumb: `${state.selectedCity} neighbourhood layer`
  });
}

function setSummary({ title, copy, jobs: jobCount, categories, metros, endpoint, breadcrumb }) {
  els.summaryTitle.textContent = title;
  els.summaryCopy.textContent = copy;
  els.summaryJobs.textContent = typeof jobCount === "number" ? formatCount(jobCount) : jobCount;
  els.summaryVelocity.textContent = state.layer === "global" ? "+14%" : "+8%";
  els.categoryChips.replaceChildren(...categories.slice(0, 5).map((category) => {
    const chip = document.createElement("span");
    chip.textContent = category;
    return chip;
  }));
  els.metroList.replaceChildren(...metros.slice(0, 5).map((metro) => {
    const li = document.createElement("li");
    const metroButton = document.createElement("button");
    metroButton.type = "button";
    metroButton.textContent = metro.name;
    metroButton.addEventListener("click", () => {
      if (metro.code) {
        state.selectedCountry = metro.code;
        setLayer("country");
      } else if (cities.some((city) => city.city === metro.name)) {
        state.selectedCity = metro.name;
        setLayer("city");
      }
    });
    const strong = document.createElement("strong");
    strong.textContent = typeof metro.count === "number" ? formatCount(metro.count) : metro.count;
    li.append(metroButton, strong);
    return li;
  }));
  els.endpointText.textContent = withPostedWithin(endpoint);
  els.breadcrumbText.textContent = breadcrumb;
}

function renderJobList() {
  const visibleJobs = filterJobs();
  if (!visibleJobs.length) {
    els.jobsList.innerHTML = `<p class="detail-company">No jobs match the active filters.</p>`;
    return;
  }
  els.jobsList.replaceChildren(...visibleJobs.map((job) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "list-item";
    item.innerHTML = `<strong>${job.title}</strong><span>${job.companyName} | ${job.location} | ${job.remoteMode} | ${job.salaryRange} | ${job.freshness}</span>`;
    item.addEventListener("click", () => {
      openJob(job.id);
      state.layer = "neighbourhood";
      setLayer("neighbourhood");
    });
    return item;
  }));
}

async function openJob(jobId) {
  const detail = await mockApi(apiRoutes.detail(jobId));
  if (!detail) return;
  state.selectedJobId = jobId;
  els.emptyJobState.hidden = true;
  els.jobDetail.hidden = false;
  els.detailFreshness.textContent = detail.freshness;
  els.detailTitle.textContent = detail.title;
  els.detailCompany.textContent = `${detail.companyName} | ${detail.location}`;
  els.detailSummary.textContent = detail.summary;
  els.applyLink.href = detail.applyUrl;
  els.detailTags.replaceChildren(...[detail.category, detail.employmentType, detail.remoteMode, detail.salaryRange].map((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    return span;
  }));
  els.prepList.replaceChildren(...[
    `Refresh examples for ${detail.requiredSkills.slice(0, 2).join(" and ")}.`,
    `Prepare one story about shipping measurable product impact.`,
    `Ask how ${detail.companyName} evaluates success in the first 90 days.`
  ].map((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  }));
  els.matchCopy.textContent = `Placeholder: strong signal on ${detail.requiredSkills.slice(0, 3).join(", ")}. Profile scoring can explain gaps once resume data is connected.`;
  els.saveJobButton.classList.remove("is-saved");
  els.saveJobButton.textContent = "Save Job";
  if (state.layer === "neighbourhood") renderNeighbourhood();
}

function closeJobPanel() {
  state.selectedJobId = null;
  els.emptyJobState.hidden = false;
  els.jobDetail.hidden = true;
  if (state.layer === "neighbourhood") renderNeighbourhood();
}

function setLayer(layer) {
  state.layer = layer;
  els.layerButtons.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.layer === layer));
  });
  if (layer === "global") renderGlobal();
  if (layer === "country") renderCountry();
  if (layer === "city") renderCity();
  if (layer === "neighbourhood") renderNeighbourhood();
  renderJobList();
}

function syncFilters() {
  state.filters = {
    q: els.searchInput.value,
    category: els.categoryFilter.value,
    place: els.placeFilter.value,
    remote: els.remoteFilter.value,
    type: els.typeFilter.value,
    postedWithin: els.postedWithinFilter.value || null
  };
  if (state.filters.place !== "global") {
    state.selectedCountry = state.filters.place;
    const country = getCountry(state.selectedCountry);
    const firstCity = getCitiesForCountry(state.selectedCountry)[0];
    if (firstCity) state.selectedCity = firstCity.city;
    setGlobeCenter(country.longitude);
  }
  setLayer(state.layer);
}

function drawAmbient() {
  const canvas = els.canvas;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const nodes = Array.from({ length: 42 }, () => ({
    x: Math.random() * rect.width,
    y: Math.random() * rect.height,
    r: Math.random() * 1.8 + 0.4,
    a: Math.random() * 0.35 + 0.1
  }));
  function frame(time) {
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const node of nodes) {
      const pulse = Math.sin(time / 900 + node.x) * 0.12;
      ctx.beginPath();
      ctx.fillStyle = `rgba(25, 240, 199, ${node.a + pulse})`;
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(25, 240, 199, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length - 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(nodes[i].x, nodes[i].y);
      ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y);
      ctx.stroke();
    }
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
}

function animateGlobe() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && !state.is2d && state.layer === "global" && !state.isDragging) {
    state.globeCenterLon = (state.globeCenterLon + 0.055) % 360;
    updateProjection();
  }
  window.requestAnimationFrame(animateGlobe);
}

els.layerButtons.forEach((button) => {
  button.addEventListener("click", () => setLayer(button.dataset.layer));
});

els.form.addEventListener("input", syncFilters);
els.form.addEventListener("submit", (event) => event.preventDefault());

els.fallbackToggle.addEventListener("click", () => {
  state.is2d = !state.is2d;
  state.isDragging = false;
  els.fallbackToggle.setAttribute("aria-pressed", String(state.is2d));
  els.mapStage.classList.toggle("is-2d", state.is2d);
  els.mapStage.classList.toggle("is-3d", !state.is2d);
  if (state.is2d) clampPan();
  updateProjection();
});

els.zoomOutButton.addEventListener("click", () => setZoom(state.targetZoom / 1.16));
els.zoomInButton.addEventListener("click", () => setZoom(state.targetZoom * 1.16));
els.zoomResetButton.addEventListener("click", resetZoom);

els.mapViewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  const factor = Math.exp(-event.deltaY * 0.0018);
  setZoom(state.targetZoom * factor, event);
}, { passive: false });

els.mapStage.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button, input, select, a")) return;
  state.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (state.activePointers.size === 2) {
    state.isDragging = false;
    state.pinchStartDistance = pointerDistance([...state.activePointers.values()]);
    state.pinchStartZoom = state.targetZoom;
    els.mapStage.setPointerCapture(event.pointerId);
    return;
  }
  state.isDragging = true;
  state.dragStartX = event.clientX;
  state.dragStartY = event.clientY;
  state.dragStartLon = state.globeCenterLon;
  state.dragStartPanX = state.panX;
  state.dragStartPanY = state.panY;
  els.mapStage.setPointerCapture(event.pointerId);
});

els.mapStage.addEventListener("pointermove", (event) => {
  if (state.activePointers.has(event.pointerId)) {
    state.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  if (state.activePointers.size >= 2) {
    const nextDistance = pointerDistance([...state.activePointers.values()]);
    if (state.pinchStartDistance > 0) {
      setZoom(state.pinchStartZoom * (nextDistance / state.pinchStartDistance));
    }
    return;
  }

  if (!state.isDragging) return;
  const deltaX = event.clientX - state.dragStartX;
  const deltaY = event.clientY - state.dragStartY;
  if (state.is2d) {
    state.panX = state.dragStartPanX + deltaX;
    state.panY = state.dragStartPanY + deltaY;
    clampPan();
    updateProjection();
    return;
  }
  state.globeCenterLon = state.dragStartLon - deltaX * 0.44 / state.zoom;
  updateProjection();
});

els.mapStage.addEventListener("pointerup", (event) => {
  state.activePointers.delete(event.pointerId);
  state.isDragging = false;
  if (els.mapStage.hasPointerCapture(event.pointerId)) {
    els.mapStage.releasePointerCapture(event.pointerId);
  }
  if (state.activePointers.size === 1) {
    const [remainingPointer] = [...state.activePointers.values()];
    state.isDragging = true;
    state.dragStartX = remainingPointer.x;
    state.dragStartY = remainingPointer.y;
    state.dragStartLon = state.globeCenterLon;
    state.dragStartPanX = state.panX;
    state.dragStartPanY = state.panY;
  }
});

els.mapStage.addEventListener("pointercancel", (event) => {
  state.activePointers.delete(event.pointerId);
  state.isDragging = false;
});

els.listModeToggle.addEventListener("click", () => {
  state.listMode = !state.listMode;
  els.listModeToggle.setAttribute("aria-pressed", String(state.listMode));
  els.jobsListPanel.classList.toggle("is-open", state.listMode);
});

els.closeListButton.addEventListener("click", () => {
  state.listMode = false;
  els.listModeToggle.setAttribute("aria-pressed", "false");
  els.jobsListPanel.classList.remove("is-open");
});

els.closePanelButton.addEventListener("click", closeJobPanel);

els.saveJobButton.addEventListener("click", () => {
  const saved = els.saveJobButton.classList.toggle("is-saved");
  els.saveJobButton.textContent = saved ? "Saved" : "Save Job";
});

window.addEventListener("resize", drawAmbient);

drawAmbient();
setLayer("global");
animateGlobe();
