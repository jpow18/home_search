"use client";

import {
  ArrowUpRight,
  BedDouble,
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  Home,
  LandPlot,
  MapPin,
  Menu,
  Pause,
  Pencil,
  Play,
  Plus,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardData, Listing, ListingStatus, SearchRule } from "@/lib/types";

type Tab = "new" | "saved";

const price = (value: number | null, currency = "USD") =>
  value == null
    ? "Price not listed"
    : new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

const relativeDate = (value: string) => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
};

export function Dashboard({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("new");
  const [selectedSearch, setSelectedSearch] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SearchRule | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ListingStatus>>({});
  const [isPending, startTransition] = useTransition();

  const localListings = useMemo(
    () => initialData.listings.map((listing) => ({ ...listing, status: statusOverrides[listing.id] || listing.status })),
    [initialData.listings, statusOverrides],
  );

  const visibleListings = useMemo(() => localListings.filter((listing) => {
    const statusMatch = tab === "saved" ? listing.status === "saved" : listing.status === "new";
    return statusMatch && (selectedSearch === "all" || listing.search_id === selectedSearch);
  }), [localListings, selectedSearch, tab]);
  const selectedRule = initialData.searches.find((rule) => rule.id === selectedSearch);

  const runAgent = async (searchId?: string) => {
    if (initialData.demo) return setMessage("Add your Supabase and OpenAI keys to run a real search.");
    if (!initialData.configured.agent) return setMessage("Add OPENAI_API_KEY before running the agent.");
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchId }),
      });
      const started = await response.json();
      if (!response.ok) throw new Error(started.error);
      const runIds = started.runs.map((run: { id: string }) => run.id);
      if (!runIds.length) throw new Error("There are no active searches to run.");

      const query = new URLSearchParams(runIds.map((id: string) => ["id", id]));
      const deadline = Date.now() + 9 * 60_000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        const checkResponse = await fetch(`/api/run?${query}`, { cache: "no-store" });
        const result = await checkResponse.json();
        if (!checkResponse.ok) throw new Error(result.error);
        if (result.status === "failed") {
          throw new Error(result.runs.find((run: { error?: string }) => run.error)?.error || "The search failed.");
        }
        if (result.status === "complete") {
          setMessage(`Search complete. Found ${result.runs.reduce((sum: number, item: { found: number }) => sum + item.found, 0)} listings.`);
          startTransition(() => router.refresh());
          return;
        }
      }
      throw new Error("The search is still running. Try again in a moment.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The search failed.");
    } finally {
      setRunning(false);
    }
  };

  const updateListing = async (listing: Listing, status: ListingStatus) => {
    if (initialData.demo) return setMessage("Demo data is read-only. Connect Supabase to triage listings.");
    setStatusOverrides((items) => ({ ...items, [listing.id]: status }));
    const response = await fetch(`/api/listings/${listing.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setStatusOverrides((items) => {
        const next = { ...items };
        delete next[listing.id];
        return next;
      });
      setMessage("Could not update the listing.");
    }
  };

  const setSearchActive = async (rule: SearchRule) => {
    if (initialData.demo) return setMessage("Demo searches are read-only. Connect Supabase to manage them.");
    const response = await fetch("/api/searches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, active: !rule.active }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "Could not update the search.");
    setMessage(rule.active ? "Search paused." : "Search resumed.");
    startTransition(() => router.refresh());
  };

  const deleteSearch = async (rule: SearchRule) => {
    if (initialData.demo) return setMessage("Demo searches are read-only. Connect Supabase to manage them.");
    if (!window.confirm(`Delete “${rule.name}” and all of its listings? This cannot be undone.`)) return;
    const response = await fetch("/api/searches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "Could not delete the search.");
    setSelectedSearch("all");
    setMessage("Search deleted.");
    startTransition(() => router.refresh());
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <Link className="brand" href="/" aria-label="HomeSeek home">
            <span className="brand-mark"><Radar size={21} /></span>
            <span>HomeSeek</span>
          </Link>
          <button className="icon-button mobile-only" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={20} /></button>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#matches"><Home size={18} /> Matches <span>{localListings.filter((item) => item.status === "new").length}</span></a>
          <button className="nav-item" onClick={() => setTab("saved")}><Bookmark size={18} /> Saved <span>{localListings.filter((item) => item.status === "saved").length}</span></button>
        </nav>

        <div className="sidebar-section">
          <div className="section-heading">
            <span>Your searches</span>
            <button onClick={() => { setEditingSearch(null); setShowForm(true); }} aria-label="Add search"><Plus size={16} /></button>
          </div>
          <div className="search-rule-list">
            {initialData.searches.map((rule, index) => (
              <button
                className={`search-rule ${selectedSearch === rule.id ? "selected" : ""}`}
                key={rule.id}
                onClick={() => { setSelectedSearch(rule.id); setMobileNav(false); }}
              >
                <span className={`rule-color color-${index % 4}`} />
                <span><strong>{rule.name}</strong><small>{rule.location}</small></span>
                <span className={`status-dot ${rule.active ? "live" : ""}`} aria-label={rule.active ? "Active" : "Paused"} />
              </button>
            ))}
          </div>
        </div>

        <div className="agent-status">
          <div className="agent-orbit"><span /><Radar size={24} /></div>
          <div><strong>Scout is {running ? "searching" : "ready"}</strong><small>{running ? "Checking the live web…" : "Next run · tomorrow"}</small></div>
        </div>

        <div className="sidebar-footer">
          <button onClick={() => setMessage("Set secrets in your Vercel project settings. See README.md for the full list.")}><SlidersHorizontal size={17} /> Settings</button>
          <a href="https://github.com" target="_blank" rel="noreferrer"><ExternalLink size={17} /> GitHub</a>
        </div>
      </aside>

      {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main className="main-content" id="matches">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="topbar-spacer" />
          <div className="last-run"><Clock3 size={15} /> Last run {initialData.recentRuns[0] ? relativeDate(initialData.recentRuns[0].started_at).toLowerCase() : "never"}</div>
          <button className="run-button" disabled={running || isPending} onClick={() => runAgent(selectedSearch === "all" ? undefined : selectedSearch)}>
            {running ? <span className="spinner" /> : <Sparkles size={16} />} {running ? "Scout is searching" : "Run scout now"}
          </button>
          <button className="avatar" aria-label="Owner menu">YO</button>
        </header>

        <div className="page-wrap">
          {initialData.demo && (
            <section className="setup-banner">
              <div><span className="setup-icon"><Bell size={18} /></span><div><strong>You are viewing the trail map.</strong><p>Add your four server keys to turn on live searches, saved data, and email alerts.</p></div></div>
              <a href="https://github.com" target="_blank" rel="noreferrer">Open setup <ArrowUpRight size={15} /></a>
            </section>
          )}

          {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss"><X size={16} /></button></div>}

          <section className="hero-row">
            <div>
              <p className="eyebrow">The morning field report</p>
              <h1>{tab === "new" ? "Fresh ground." : "Worth another look."}</h1>
              <p>{tab === "new" ? "Your agent searched, sorted, and marked the strongest leads." : "The places you kept are gathered here."}</p>
            </div>
            <div className="hero-stamp" aria-hidden="true"><span>{visibleListings.length}</span><small>{tab === "new" ? "new leads" : "saved leads"}</small></div>
          </section>

          <section className="toolbar" aria-label="Listing controls">
            <div className="tabs">
              <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}>New matches <span>{localListings.filter((item) => item.status === "new").length}</span></button>
              <button className={tab === "saved" ? "active" : ""} onClick={() => setTab("saved")}>Saved <span>{localListings.filter((item) => item.status === "saved").length}</span></button>
            </div>
            <div className="tool-actions">
              <label className="search-select">
                <Filter size={15} />
                <select value={selectedSearch} onChange={(event) => setSelectedSearch(event.target.value)} aria-label="Filter by saved search">
                  <option value="all">All searches</option>
                  {initialData.searches.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
                </select>
              </label>
              {selectedRule && <>
                <button className="search-action" onClick={() => { setEditingSearch(selectedRule); setShowForm(true); }}><Pencil size={15} /> Edit</button>
                <button className="search-action" onClick={() => setSearchActive(selectedRule)}>{selectedRule.active ? <Pause size={15} /> : <Play size={15} />} {selectedRule.active ? "Pause" : "Resume"}</button>
                <button className="search-action danger" onClick={() => deleteSearch(selectedRule)}><Trash2 size={15} /> Delete</button>
              </>}
              <button className="add-search" onClick={() => { setEditingSearch(null); setShowForm(true); }}><Plus size={16} /> New search</button>
            </div>
          </section>

          <section className="listing-list" aria-live="polite">
            {visibleListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} onUpdate={updateListing} />
            ))}
            {visibleListings.length === 0 && (
              <div className="empty-state">
                <div className="empty-rings"><Search size={28} /></div>
                <h2>No tracks here yet.</h2>
                <p>{tab === "saved" ? "Save a strong match and it will wait here." : "Run the scout or broaden your search rules."}</p>
                <button onClick={() => tab === "saved" ? setTab("new") : runAgent()}> {tab === "saved" ? "View new matches" : "Run scout"} <ChevronRight size={16} /></button>
              </div>
            )}
          </section>
        </div>
      </main>

      {showForm && <SearchForm demo={initialData.demo} rule={editingSearch} onClose={() => setShowForm(false)} onMessage={setMessage} />}
    </div>
  );
}

function ListingCard({ listing, onUpdate }: { listing: Listing; onUpdate: (listing: Listing, status: ListingStatus) => void }) {
  return (
    <article className="listing-card">
      <a className="listing-image" href={listing.url} target="_blank" rel="noreferrer" aria-label={`Open ${listing.title}`}>
        {/* Listing hosts are arbitrary, so a native image avoids an unsafe all-hosts image proxy. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {listing.image_url ? <img src={listing.image_url} alt="" /> : <div className="image-placeholder"><Home size={32} /></div>}
        <span className="match-score"><strong>{listing.score}%</strong> match</span>
        <span className="source-pill">{listing.source}</span>
      </a>
      <div className="listing-copy">
        <div className="listing-title-row">
          <div>
            <p className="listing-search"><span /> {listing.search?.name || "Saved search"}</p>
            <h2>{listing.title}</h2>
            <p className="address"><MapPin size={14} /> {listing.address}</p>
          </div>
          <strong className="price">{price(listing.price, listing.currency)}</strong>
        </div>
        <div className="facts">
          {listing.beds != null && <span><BedDouble size={16} /> {listing.beds} beds</span>}
          {listing.baths != null && <span>{listing.baths} baths</span>}
          {listing.acres != null && <span><LandPlot size={16} /> {listing.acres} acres</span>}
          <span>Found {relativeDate(listing.first_seen_at).toLowerCase()}</span>
        </div>
        <p className="summary">{listing.summary}</p>
        <div className="signals">
          {listing.pros.slice(0, 3).map((pro) => <span className="pro" key={pro}><Check size={13} /> {pro}</span>)}
          {listing.cons.slice(0, 1).map((con) => <span className="con" key={con}>! {con}</span>)}
        </div>
        <div className="card-actions">
          <a href={listing.url} target="_blank" rel="noreferrer">View original <ArrowUpRight size={15} /></a>
          <div>
            <button className={listing.status === "saved" ? "saved" : ""} onClick={() => onUpdate(listing, listing.status === "saved" ? "new" : "saved")}><Bookmark size={16} /> {listing.status === "saved" ? "Saved" : "Save"}</button>
            <button onClick={() => onUpdate(listing, "passed")}><X size={16} /> Pass</button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SearchForm({ demo, rule, onClose, onMessage }: { demo: boolean; rule: SearchRule | null; onClose: () => void; onMessage: (value: string) => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (demo) {
      onClose();
      return onMessage("Connect Supabase before you add a real search.");
    }
    setSaving(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/searches", {
      method: rule ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, ...(rule ? { id: rule.id } : {}) }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Could not save search.");
      setSaving(false);
      return;
    }
    onClose();
    onMessage(rule ? "Search updated. New parameters apply to the next run." : "Search saved. Scout will include it in the next run.");
    router.refresh();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <div className="modal-head">
          <div><p className="eyebrow">{rule ? "Adjust this trail" : "Give Scout a new trail"}</p><h2 id="search-title">{rule ? "Edit property search" : "Create a property search"}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="field-grid">
            <label className="wide">Search name<input name="name" required maxLength={100} defaultValue={rule?.name} placeholder="Blue Ridge basecamp" /></label>
            <label className="wide">Where to search<input name="location" required maxLength={200} defaultValue={rule?.location} placeholder="Asheville, NC + 40 miles" /></label>
            <label>Property type<select name="property_type" defaultValue={rule?.property_type || "either"}><option value="either">Home or land</option><option value="home">Home</option><option value="land">Land</option></select></label>
            <label>Minimum bedrooms<input name="min_beds" type="number" min="0" step="1" defaultValue={rule?.min_beds ?? ""} placeholder="2" /></label>
            <label>Minimum price<CurrencyInput name="min_price" value={rule?.min_price} placeholder="$250,000" /></label>
            <label>Maximum price<CurrencyInput name="max_price" value={rule?.max_price} placeholder="$650,000" /></label>
            <label>Minimum acres<input name="min_acres" type="number" min="0" step="0.1" defaultValue={rule?.min_acres ?? ""} placeholder="2" /></label>
            <label>Alert email<input name="alert_email" type="email" defaultValue={rule?.alert_email} placeholder="you@example.com" /></label>
            <label className="wide">Must haves<textarea name="must_haves" rows={2} defaultValue={rule?.must_haves} placeholder="Mountain view, reliable internet, no HOA" /></label>
            <label className="wide">Deal breakers<textarea name="deal_breakers" rows={2} defaultValue={rule?.deal_breakers} placeholder="Flood zone, seasonal access" /></label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving…" : rule ? "Save changes" : "Save search"}</button></div>
        </form>
      </section>
    </div>
  );
}

function CurrencyInput({ name, value, placeholder }: { name: string; value?: number | null; placeholder: string }) {
  const format = (amount: string | number) => `$${Number(amount).toLocaleString("en-US")}`;
  const [display, setDisplay] = useState(value == null ? "" : format(value));
  return (
    <input
      name={name}
      type="text"
      inputMode="numeric"
      maxLength={16}
      value={display}
      placeholder={placeholder}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "");
        setDisplay(digits ? format(digits) : "");
      }}
    />
  );
}
