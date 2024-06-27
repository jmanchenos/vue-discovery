import fs from 'fs';
import path from 'path';

const log = (msg='') => console.log(msg);

const readComponentFile = async iPath => {
  try {
    return await fs.promises.readFile(path.join(process.cwd(), iPath), 'utf8');
  } catch (err) {
    log(err);
    throw err;
  }
};

const processScriptVueFile = vueFile => vueFile.match(/<script>([\s\S]*?)<\/script>/);

const minLength = input => input.trim().length;

const extensionRequired = (input, ext) => !input.endsWith(ext);

const errorMessage = type => {
  const response = {
    min: 'El nombre del fichero no puede estar vacio',
    format: 'El formato del nombre del archivo no es correcto',
    ext: 'El nombre del archivo debe terminar con ".vue"',
  };
  return response[type];
};

const validationFilenName = input => {
  const validateMin = minLength(input) === 0 ? errorMessage('min') : false;
  const validateExtension = extensionRequired(input, 'vue') ? errorMessage('ext') : false;
  return validateMin || validateExtension || true;
};

const questions = [
  {
    type: 'input',
    name: 'fileNameToTest',
    message: 'Ruta y nombre del fichero a testear (Ejemplo: "@/components/Acontecimientos.vue)"',
    validate: validationFilenName,
  },
];

const parseDataOptionsAPI = (type, textScript) => {
  let propsStart = textScript.indexOf(type);
  if (propsStart === -1) return [];

  let bracketCount = 0;
  let propsEnd = -1;
  for (let i = propsStart; i < textScript.length; i++) {
    if (textScript[i] === '{') {
      if (bracketCount === 0) propsStart = i;
      bracketCount++;
    } else if (textScript[i] === '}') {
      bracketCount--;
      if (bracketCount === 0) {
        propsEnd = i;
        break;
      }
    }
  }

  if (propsEnd === -1) return [];
  if (type === 'props:') {
    const optionsAPIProps = textScript.substring(propsStart, propsEnd + 1);

    return optionsAPIProps
      .replace(/\s/g, '')
      .split('},')
      .map(item => item.split('{'))
      .map((item, index, arr) =>
        index === 0 ? item.shift() : arr.length - 1 === index ? false : item
      )
      .filter(Boolean)
      .map(item => {
        const key = item[0].replaceAll(`'`, '').replaceAll(':', '');
        const isArrType = item[1].split(item[1].indexOf('],') < 0 ? ',' : '],');
        return {
          [key]: isArrType.filter(Boolean).map(eachItem => {
            const eachKey = eachItem.split(':')[0];
            const eachValue = eachItem
              .split(':')[1]
              .replaceAll(']', '')
              .replaceAll('[', '')
              .split(',');
            return { [eachKey]: eachValue[0] };
          }),
        };
      });
    // return textScript.substring(propsStart, propsEnd + 1).match(/\b\w+(?=:\s*{)/g);
  }
  if (['computed:', 'watch:', 'methods:'].includes(type)) {
    const computedNamed = eval(`(${textScript.substring(propsStart, propsEnd + 1)})`);
    return Object.keys(computedNamed).map(item => item);
  }
};

const parseEvents = text => {
  const patron = /emits:\s*\[\s*[^\]]*\s*\]\s*,/;
  const resultado = patron.exec(text);
  if (resultado) {
    return resultado?.[0]
      .toString()
      .replaceAll('\n', '')
      .match(/\[(.*?)\]/)[1]
      .split(',')
      .map(item => item.trim().replaceAll(`'`, ''));
  } else {
    return [];
  }
};

const checkFile = filePath => {
  const fullPath = `./tests/unit/${filePath}`;
  if (fs.existsSync(fullPath)) {
    const baseName = path.basename(fullPath, path.extname(fullPath)).split('.')[0];
    const formattedDate = new Date()
      .toISOString()
      .replaceAll('-', '_')
      .replaceAll(':', '_')
      .split('.')[0]
      .replace('T', '-');
    const pathArr = fullPath.split('/');
    return `${pathArr
      .splice(0, pathArr.length - 1)
      .join('/')}/${baseName}_${formattedDate}.spec.js`;
  } else {
    return fullPath;
  }
};

const getFolderPath = filePath =>
  filePath
    .replace('@', '')
    .split('/')
    .filter(Boolean)
    .splice(0, filePath.replace('@', '').split('/').filter(Boolean).length - 1)
    .join('/');

const writeTestFile = (payload, answers) => {
  const componentName = answers.fileNameToTest.split('/').at(-1).split('.')[0];
  const fileNameTest = `${componentName}.spec.js`;
  const folderPath = `${getFolderPath(answers.fileNameToTest)}/${fileNameTest}`;
  const fileName = checkFile(folderPath);
  const dirName = path.dirname(fileName);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  fs.writeFileSync(fileName, payload);
  log(`Fichero "${fileName}" creado correctamente`);
};

const processTempalteVueFile = templatePayload => {
  const initTag = '<template>';
  const endTag = '</template>';
  const initTemplate = templatePayload.indexOf(initTag);
  const endTemplate = templatePayload.lastIndexOf(endTag);
  return templatePayload.substring(initTemplate, endTemplate + endTag.length);
};

const getVmodel = templatePayload => {
  const vModelRegex = /v-model(?::[\w-]+)?="[^"]*"/g;
  const matches = templatePayload.match(vModelRegex);
  if (matches) {
    return matches.map(match => {
      const { 0: attr, 1: value } = match.split('=');
      const arrAttrs = attr.split(':');
      return arrAttrs.length > 1 ? arrAttrs[1] : `modelValue de ${value.replace(/"/g, '')}`;
    });
  } else {
    return [];
  }
};

const getHookLifeCyleText = type => {
  const hookText = {
    beforeCreate: `it('beforeCreate - se llama antes de la creación de la instancia', () => {
      const spy = vitest.spyOn(vm, 'beforeCreate');
      vm.$options.beforeCreate();
      expect(spy).toHaveBeenCalled();
    });
    `,
    created: `it('created - se llama después de la creación de la instancia', () => {
      const spy = vitest.spyOn(vm, 'created');
      vm.$options.created();
      expect(spy).toHaveBeenCalled();
    });
    `,
    beforeMount: `it('beforeMount - se llama antes de montar el componente', () => {
      const spy = vitest.spyOn(vm, 'beforeMount');
      mount(vm);
      expect(spy).toHaveBeenCalled();
    });
    `,
    mounted: `it('mounted - se llama después de montar el componente', () => {
      const spy = vitest.spyOn(vm, 'mounted');
      mount(vm);
      vm.$nextTick(() => {
        expect(spy).toHaveBeenCalled();
      });
    });
    `,
    beforeUpdate: `it('beforeUpdate - se llama antes de actualizar el componente', () => {
      const spy = vitest.spyOn(vm, 'beforeUpdate');
      vm.someData = 'new value';
      vm.$nextTick(() => {
        expect(spy).toHaveBeenCalled();
      });
    });
    `,
    updated: `it('updated - se llama después de actualizar el componente', () => {
      const spy = vitest.spyOn(vm, 'updated');
      vm.someData = 'new value';
      vm.$nextTick(() => {
        expect(spy).toHaveBeenCalled();
      });
    });
    `,
    beforeUnmount: `it('beforeUnmount - se llama antes de desmontar el componente', () => {
      const spy = vitest.spyOn(vm, 'beforeUnmount');
      vm.$destroy();
      expect(spy).toHaveBeenCalled();
    });
    `,
    unmounted: `it('unmounted - se llama después de desmontar el componente', () => {
      const spy = vitest.spyOn(vm, 'unmounted');
      vm.$destroy();
      expect(spy).toHaveBeenCalled();
    });
    `,
    errorCaptured: `it('errorCaptured - se llama cuando se captura un error en un componente hijo', () => {
      const spy = vitest.spyOn(vm, 'errorCaptured');
      vm.$options.errorCaptured(new Error('test error'));
      expect(spy).toHaveBeenCalled();
    });
    `,
    renderTracked: '',
    renderTriggered: '',
    activated: '',
    deactivated: '',
    serverPrefetch: '',
  };
  return hookText[type];
};

const getCycleLifeHooks = scriptDefault => {
  const lifeCycleHooks = [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'beforeUnmount',
    'unmounted',
    'errorCaptured',
    'renderTracked',
    'renderTriggered',
    'activated',
    'deactivated',
    'serverPrefetch',
  ];

  const scriptLowercase = scriptDefault.toLowerCase().replace(/\s+/g, ' ');
  const foundHooks = lifeCycleHooks.filter(word => scriptLowercase.includes(word.toLowerCase()));

  let lifeCycle = '';
  if (foundHooks) {
    lifeCycle += `describe('Comprobando los hooks', () => {`;
    foundHooks.forEach(item => {
      lifeCycle += getHookLifeCyleText(item);
    });
    lifeCycle += `
  });`;
  }
  return lifeCycle;
};

const createTestFile = ({ answers, dataScript, dataTemplate }) => {
  const componentName = answers.fileNameToTest.split('/').at(-1).split('.')[0];
  const scriptDefault = Object.values(
    dataScript[1].trim().match(/export\s+default\s+({[\s\S]*})\s*,/)
  )[1];
  writeTestFile(
    getTemplateTestFile({ componentName, answers, scriptDefault, dataTemplate }),
    answers
  );
};

const renderEachOption = (render, show, type) => (show ? `const ${type}Array = [${render}];` : '');

const getDataOpionsAPI = (type, scriptDefault) => parseDataOptionsAPI(`${type}:`, scriptDefault);

const getDefaultRenderOptionsAPI = (objDefault, objType) => {
  return objDefault.default?.includes('_') ||
    ['Number', 'Boolean'].includes(objType.type) ||
    // Se usa el valor '2' ya que un valor vacio en string es '' (2 caracteres)
    (objDefault.default?.length || 0) <= 2
    ? objDefault.default
    : `'${objDefault.default.replaceAll("`", "")}'`;
};

const getDefaultCase = ({ objDefault, objType, key }) => {
  const evalFn = objDefault.default?.replace?.('() => []', '[]')?.replace?.('() => {}', '{}');
  return `['${key}', undefined, ${
    ['Object', 'Array'].includes(objType.type)
      ? evalFn
      : getDefaultRenderOptionsAPI(objDefault, objType)
  }]`;
};

const getUseCase = ({ objDefault, objType, key }) => {
  const booleanCase = objDefault.default === 'false' ? 'true' : 'false';
  const case1 = getDefaultCase({ objDefault, objType, key });
  const useCase = {
    Boolean: {
      case1,
      case2: `['${key}', ${booleanCase}, ${booleanCase}]`,
    },
    Number: {
      case1,
      case2: `['${key}', 100, 100]`,
    },
    String: {
      case1,
      case2: `['${key}', 'Hello Vue', 'Hello Vue']`,
    },
    Object: {
      case1,
      case2: `['${key}', '{}', '{}']`,
    },
    Array: {
      case1,
      case2: `['${key}', '[]', '[]']`,
    },
    RegExp: {
      case1,
      case2: `['${key}', '/^[a-zA-Z0-9]+$/', '/^[a-zA-Z0-9]+$/']`,
    },
  };
  return useCase[objType.type];
};

const renderOptionsAPI = (type, scriptDefault) => {
  let getData = getDataOpionsAPI(type, scriptDefault);
  let getDataList = '';
  if (['props'].includes(type)) {
    getDataList = getData
      ?.map(item => {
        const { 0: key, 1: props } = Object.entries(item)[0];
        const useCase = getUseCase({ objDefault: props[1] ?? 'undefined', objType: props[0], key });
        return new Array(useCase.case1, useCase.case2);
      })
      .flat();
  }
  if (['computed'].includes(type)) {
    getDataList = getData?.map(item => `['${item}', '', '']`);
  }
  if (['methods', 'watch'].includes(type)) {
    getDataList = getData?.map(item => `['${item}', async () => {}]`);
  }
  if (['events', 'v-model'].includes(type)) {
    const isEvent = type === 'events';
    getData = isEvent ? parseEvents(scriptDefault) : getVmodel(scriptDefault);
    getDataList = getData?.map(
      item => `['Comprobando ${isEvent ? 'evento' : 'v-model'} ${item}', () => {}]`
    );
  }
  const iType = type === 'watch' ? 'watches' : type === 'v-model' ? 'vModels' : type;
  return renderEachOption(getDataList, getData.length > 0, iType);
};

const getDescribe = (type, showText) => {
  const describesObject = {
    prop: `describe('Comprobando las propiedades', () => {
      it.each(propsArray)('Propiedad %s con el valor %s devuelve %s', async (...args) =>
        fnProps.apply({ wrapper }, args)
      );
    });`,
    computed: `describe('Comprobando las computadas', () => {
      it.each(arrayToObject(computedArray))('%s', async (...args) =>
        fnComputed.apply({ wrapper }, [args[1]])
      );
    });`,
    methods: `describe('Comprobando los métodos', () => {
      it.each(methodsArray)('Método %s', fnMethods);
    });`,
    watch: `describe('Comprobando Watchs', () => {
      it.each(watchesArray)('Watch sobre %s', fnMethods);
    });`,
    events: `describe('Comprobando los eventos', () => {
      it.each(eventsArray)('%s', fnMethods);
    });`,
    vmodel: `describe('Comprobando los v-models', () => {
      it.each(vModelsArray)('%s', fnMethods);
    });`,
  };
  return showText ? describesObject[type] : '';
};

const getTemplateTestFile = ({ componentName, answers, scriptDefault, dataTemplate }) => {
  const hasComputed = getDataOpionsAPI('computed', scriptDefault).length > 0;
  const hasProps = getDataOpionsAPI('props', scriptDefault).length > 0;
  const hasMethods = getDataOpionsAPI('methods', scriptDefault).length > 0;
  const hasWatch = getDataOpionsAPI('watch', scriptDefault).length > 0;
  const hasEvents = parseEvents(scriptDefault).length > 0;
  const hasVModels = getVmodel(dataTemplate).length > 0;

  return `import ${componentName} from '${answers.fileNameToTest}';
  import { useWrapper, ${hasComputed ? 'arrayToObject, fnComputed,' : ''} fnI18n, ${
    hasProps ? 'fnProps,' : ''
  } ${hasMethods ? 'fnMethods' : ''} } from '@unit/helpers/index.js';

  describe('${componentName} Component', () => {
    let wrapper;
    let vm;
    beforeEach(() => {
      wrapper = useWrapper({
        component: ${componentName},
        setup: {
          props: {},
          stubs: {},
          attrs: { class: 'test' },
        },
      });
      vm = wrapper.vm;
    });

    ${renderOptionsAPI('props', scriptDefault)}

    ${renderOptionsAPI('computed', scriptDefault)}

    ${renderOptionsAPI('methods', scriptDefault)}

    ${renderOptionsAPI('watch', scriptDefault)}

    ${renderOptionsAPI('events', scriptDefault)}

    ${renderOptionsAPI('v-model', dataTemplate)}

    it('pasa el sanity check y crea un wrapper.', () => {
      expect.hasAssertions();
      expect(wrapper.exists()).toBe(true);
    });

    it('Comprobando la importación del i18n.', () => {
      fnI18n.apply({ wrapper });
    });

    ${getDescribe('prop', hasProps)}

    ${getDescribe('computed', hasComputed)}

    ${getDescribe('methods', hasMethods)}

    ${getDescribe('watch', hasWatch)}

    ${getDescribe('events', hasEvents)}

    ${getDescribe('vmodel', hasVModels)}

    ${getCycleLifeHooks(scriptDefault)}

  });
  `;
};

export const exec = async ruta => {
    const fileContent = await readComponentFile(ruta.replace(/@\//g, './src/'));
    const dataScript = processScriptVueFile(fileContent);
    const dataTemplate = processTempalteVueFile(fileContent);
    createTestFile({ answers: {fileNameToTest:ruta}, dataScript, dataTemplate });
};

(async () => {
  try {
    if (process.argv[2]) {
      await exec(process.argv[2]);
    }
  } catch (err) {
    log(`ERROR: ${err}`);
  }
})();

