function createSlug(title, staticSlug) {
  return title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "").replace(/^-+|-+$/g, "");
}

export { createSlug as c };
