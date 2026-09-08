export type SearchRule = {
  id: string;
  name: string;
  location: string;
  property_type: "home" | "land" | "either";
  min_price: number | null;
  max_price: number | null;
  min_beds: number | null;
  min_acres: number | null;
  must_haves: string;
  deal_breakers: string;
  alert_email: string;
  active: boolean;
  created_at: string;
};

export type ListingStatus = "new" | "saved" | "passed";

export type Listing = {
  id: string;
  search_id: string;
  title: string;
  address: string;
  price: number | null;
  currency: string;
  property_type: string;
  beds: number | null;
  baths: number | null;
  acres: number | null;
  summary: string;
  score: number;
  pros: string[];
  cons: string[];
  url: string;
  image_url: string | null;
  source: string;
  status: ListingStatus;
  first_seen_at: string;
  search?: Pick<SearchRule, "name" | "location">;
};

export type Run = {
  id: string;
  search_id: string;
  status: "running" | "complete" | "failed";
  found_count: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export type DashboardData = {
  searches: SearchRule[];
  listings: Listing[];
  recentRuns: Run[];
  demo: boolean;
  configured: {
    database: boolean;
    agent: boolean;
    email: boolean;
  };
};
