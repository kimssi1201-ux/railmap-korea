// A TAGO provider may return no name matches in the first page while more pages exist.
// The client must not hide pagination solely because the current page has zero matches.
export function hasMoreCitybusPages(response, page, maxPage=30) {
  return Boolean(response?.partial) && Number.isInteger(page) && page>=1 && page<maxPage;
}