delete from public.listings as listing
using public.searches as search
where listing.search_id = search.id
  and listing.status = 'new'
  and (
    (search.min_price is not null and (listing.price is null or listing.price < search.min_price))
    or (search.max_price is not null and (listing.price is null or listing.price > search.max_price))
    or (search.min_beds is not null and (listing.beds is null or listing.beds < search.min_beds))
    or (search.min_acres is not null and (listing.acres is null or listing.acres < search.min_acres))
  );
