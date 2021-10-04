import showLoading from './showLoading';

/**
 * @namespace $Loading
 */

const Load = {
  install(Vue) {
    const vueLocal = Vue;
    vueLocal.prototype.$Loading = {
      show: message => {
        showLoading.show(message);
      },
      hide: () => {
        showLoading.hide();
      },
    };
  },
};

export default Load;
