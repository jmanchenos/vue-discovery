export const getForm = function(modelFront = {}, data) {
  return typeof modelFront === 'function'
    ? Object.values(data || {}).length
      ? { form: new modelFront(data) }
      : {}
    : {};
};
export const getSelects = async function(links, selects) {
  const objectSelects = createAllSelects(selects);
  const filterLinks = getLinks(links, selects);
  const resolveLinks = await getResolveLinks.call(this, filterLinks, links);
  return getResponseLinks(resolveLinks, filterLinks, objectSelects);
};
const createAllSelects = function(selects) {
  let result = {};
  selects.forEach(item => (result[item.name] = []));
  return result;
};
const getLinks = function(links, selects) {
  return selects.filter(select => !!links?.[select.alias]?.href);
};
const getResolveLinks = async function(filterLinks, links) {
  return await Promise.all(
    filterLinks.map(select =>
      this.$APIService.get(links?.[select.alias]?.href || '', select.params || {})
    )
  );
};
const getResponseLinks = async function(resolveLinks, filterLinks, selects) {
  let internalSelect = { ...selects };
  filterLinks.forEach((select, index) => {
    const resultField = select.resultProperty || 'content';
    internalSelect[select.name] = resolveLinks[index]?.data?.[resultField] || [];
  });
  return internalSelect;
};
