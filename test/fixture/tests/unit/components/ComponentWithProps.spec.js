import ComponentWithProps from '@/components/ComponentWithProps.vue';
  import { useWrapper,  fnI18n, fnProps,  } from '@unit/helpers/index.js';

  describe('ComponentWithProps Component', () => {
    let wrapper;
    let vm;
    beforeEach(() => {
      wrapper = useWrapper({
        component: ComponentWithProps,
        setup: {
          props: {},
          stubs: {},
          attrs: { class: 'test' },
        },
      });
      vm = wrapper.vm;
    });

    const propsArray = [['defaultValue', undefined, undefined],['defaultValue', 'Hello Vue', 'Hello Vue']];

    

    

    

    

    

    it('pasa el sanity check y crea un wrapper.', () => {
      expect.hasAssertions();
      expect(wrapper.exists()).toBe(true);
    });

    it('Comprobando la importación del i18n.', () => {
      fnI18n.apply({ wrapper });
    });

    describe('Comprobando las propiedades', () => {
      it.each(propsArray)('Propiedad %s con el valor %s devuelve %s', async (...args) =>
        fnProps.apply({ wrapper }, args)
      );
    });

    

    

    

    

    

    describe('Comprobando los hooks', () => {it('created - se llama después de la creación de la instancia', () => {
      const spy = vitest.spyOn(vm, 'created');
      vm.$options.created();
      expect(spy).toHaveBeenCalled();
    });
    
  });

  });
  