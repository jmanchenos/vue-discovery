const getUrl = (alias = '', links = []) => {
  // const errorMessage = `No se puede realizar la consulta del alias ${alias}. No existe el link`;
  const errorMessage = `Error en la carga de la página`;
  const url = links[alias]?.href && links[alias]?.href !== 'Forbidden' && links[alias]?.href;
  if (url) return { status: true, response: url };
  else return { status: false, response: errorMessage };
};

const UtilsGeneric = {
  install(Vue) {
    const vueLocal = Vue;
    vueLocal.prototype.$UtilsGeneric = {
      getUrl: (alias = '', links = []) => getUrl(alias, links),
    };
  },
};

export default UtilsGeneric;
