import AnotherComponent from '@/components/AnotherComponent.vue';
  import { useWrapper,  fnI18n,   } from '@unit/helpers/index.js';

  describe('AnotherComponent Component', () => {
    let wrapper;
    let vm;
    beforeEach(() => {
      wrapper = useWrapper({
        component: AnotherComponent,
        setup: {
          props: {},
          stubs: {},
          attrs: { class: 'test' },
        },
      });
      vm = wrapper.vm;
    });

    

    

    

    

    

    

    it('pasa el sanity check y crea un wrapper.', () => {
      expect.hasAssertions();
      expect(wrapper.exists()).toBe(true);
    });

    it('Comprobando la importación del i18n.', () => {
      fnI18n.apply({ wrapper });
    });

    

    

    

    

    

    

    describe('Comprobando los hooks', () => {
  });

  });
  