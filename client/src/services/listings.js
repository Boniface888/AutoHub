export const apiBase = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : "");

export async function getListings(filters, signal) {
  const search = new URLSearchParams({ type: filters.type, sort: filters.sort === "price-low" ? "price_asc" : filters.sort === "price-high" ? "price_desc" : "newest", page: "1", pageSize: "48" });
  if (filters.search) search.set("search", filters.search);
  if (filters.location) search.set("location", filters.location);
  if (filters.maxPrice) search.set("maxPrice", filters.maxPrice);

  const response = await fetch(`${apiBase}/api/listings?${search}`, { signal, credentials: "include" });
  if (!response.ok) throw new Error("Could not load listings.");
  const data = await response.json();
  return data.listings.map((listing) => ({ ...listing, status: listing.type, image: listing.imageUrl || "/src/assets/hero.png", mileage: "Contact for details" }));
}
