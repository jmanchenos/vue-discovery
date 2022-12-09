// constant
import { TIPOS_COMPONENTES, HASH_HOME } from './../constant/common';

/**
 * Hace click en un submenu
 * @param {string} menu descripcion del menu
 * @param {string} submenu descripcion del submenu
 */
Cypress.Commands.add('irSubMenu', (menu, submenu) => {
  cy.findByTestId(menu).click({ force: true });
  cy.findAllByTestId(submenu)
    .first()
    .click({ force: true });
});

/**
 * Selecciona una tipologia por su descripción
 * @param {string} tipologia descripcion de la tipología
 */
Cypress.Commands.add('seleccionarTipologia', tipologia => {
  cy.findByTestId('tipologia')
    .findByLabelText(tipologia)
    .find('input')
    .click({ force: true });
});

/**
 * Comprueba si el identificador que se le pasa está vacio
 * @param {string} campo identificador del item
 */
Cypress.Commands.add('comprobarCampoVacio', campo => {
  cy.findByTestId(campo)
    .should('be.visible')
    .invoke('val')
    .should('be.empty');
});

/**
 * Comprueba si el identificador que se le pasa existe
 * @param {string} campo identificador del item
 */
Cypress.Commands.add('comprobarCampoExiste', campo => {
  cy.findByTestId(campo)
    .should('be.visible')
    .invoke('val')
    .should('be.exist');
});

/**
 * Comprueba si el identificador que se le pasa está dehsabilitado
 * @param {string} campo identificador del item
 */
Cypress.Commands.add('comprobarCampoDeshabilitado', campo => {
  cy.findByTestId(campo)
    .should('be.visible')
    .and('be.disabled');
});

/**
 * Comprueba si el identificador que se le pasa tiene el valor indicado
 * @param {string} name identificador del item
 * @param {string} value valor del item
 */
Cypress.Commands.add('comprobarCampoPrecargado', ({ name, value }) => {
  cy.findByTestId(name)
    .invoke('val')
    .should('eq', value);
});

/**
 * Recorre el array que se le pasa como parametro de entrada
 * y llama al comando que comprueba si el campo está vacio
 * @param {array} campos array de identificadores
 */
Cypress.Commands.add('comprobarCamposVacios', campos => {
  for (const campo of campos) {
    cy.comprobarCampoVacio(campo);
  }
});

/**
 * Recorre el array que se le pasa como parametro de entrada
 * y llama al comando que comprueba si el campo existe
 * @param {array} campos array de identificadores
 */
Cypress.Commands.add('comprobarCamposExisten', campos => {
  for (const campo of campos) {
    cy.comprobarCampoExiste(campo);
  }
});

/**
 * Recorre el array que se le pasa como parametro de entrada
 * y llama al comando que comprueba si el campo está deshabilitado
 * @param {array} campos array de identificadores
 */
Cypress.Commands.add('comprobarCamposDeshabilitados', campos => {
  for (const campo of campos) {
    cy.comprobarCampoDeshabilitado(campo);
  }
});

/**
 * Recorre el array que se le pasa como parametro de entrada
 * y llama al comando que comprueba si el campo tiene
 * @param {array} campos array de de objetos com la estructura:
 *  "{ name: IDENTIFICADOR, value: VALOR DEL IDENTIFICADOR }"
 */
Cypress.Commands.add('comprobarCamposPrecargados', campos => {
  for (const campo of campos) {
    cy.comprobarCampoPrecargado(campo);
  }
});
/**
 * Redirige a la pantalla home y seleciona el contexto que se le pasa como paramentro de entrada.
 * En el caso que que no esté logueado se llamara al comando que inicia sesión.
 * @param {string} usuario
 * @param {string} password
 * @param {string} contexto
 * @param {boolean} mantenerLocalStorage
 */
Cypress.Commands.add(
  'iniciarAplicacion',
  ({ usuario, password, contexto, mantenerLocalStorage }) => {
    if (mantenerLocalStorage) {
      Cypress.LocalStorage.clear = () => {};
    }

    cy.visit(HASH_HOME);
    cy.hash().then(hash => {
      if (hash !== HASH_HOME) {
        cy.iniciarSesion(usuario, password);
      }
      cy.findByTestId(contexto).click({ force: true });
    });
  }
);

/**
 * Inicia sesión
 * @param {string} usuario
 * @param {string} password
 */
Cypress.Commands.add(
  'iniciarSesion',
  (usuario = Cypress.env('usuLogin'), password = Cypress.env('password')) => {
    Cypress.on('uncaught:exception', () => false);
    cy.findByTestId('username').type(usuario);
    cy.findByTestId('password').type(password);

    cy.findByTestId('submit')
      .should('be.visible')
      .click();
  }
);

/**
 * Recorre el array que se le pasa como parametro de entrada y rellena los campos
 * @param {array} campos array de objetos que se van a rellenar
 * @param {Object} options opciones de log y force y dalay
 */
Cypress.Commands.add('rellenarFormularioPorArray', (campos, options = {}) => {
  for (const campo of campos) {
    if (campo.type === TIPOS_COMPONENTES.INPUT_RADIO) {
      cy.findByTestId(campo.name)
        .findByLabelText(campo.value)
        .find('input')
        .click({ force: true });
    } else if (campo.type === TIPOS_COMPONENTES.SELECT) {
      cy.findByTestId(campo.name).select(campo.value);
    } else {
      cy.findClearAndType(campo.name, campo.value, options);
    }
  }
});

/**
 * Busca el item, hace clear y rellena con el valor de entrada
 * Si el item no existe devolvera error. Se puede usar con alias
 * También valida que el valor introducido quede asignado al campo
 * @param {string} dataCy identificador del item (alias o no)
 * @param {string|Object{{string} inicio, {string} fin}} data valor a rellenar
 * @param {Object} options opciones de log, force y delay
 */
Cypress.Commands.add('findClearAndType', (dataCy, data = '', options = {}) => {
  cy.findAndType(
    dataCy,
    { inicio: `{selectall}${data.inicio ?? data}`, fin: data.fin ?? data },
    options
  );
});

/**
 * Busca el item y rellena con el valor de entrada
 * Si el item no existe devolvera error. Se puede usar con alias
 * También valida que el valor introducido quede asignado al campo
 * @param {string} dataCy identificador del item (alias o no)
 * @param {string|Object{{string} inicio, {string} fin}} data valor a rellenar
 * @param {Object} options opciones de log y force y dalay
 */
Cypress.Commands.add('findAndType', (dataCy, data, options = {}) => {
  let inicio = data instanceof Object ? data.inicio : data;
  const fin = data instanceof Object ? data.fin : data;
  const cyObject = dataCy.startsWith('@') ? cy.get(dataCy) : cy.findByTestId(dataCy);
  cyObject.then($el => {
    const cyFinal = cy.wrap($el, { log: false });
    if (['date', 'time'].includes($el[0].type) && inicio.startsWith('{selectall}')) {
      inicio = fin;
      cyFinal.clear();
    }
    cyFinal.type(inicio, options).then($elem => {
      assert.equal($elem[0].tagName === 'DIV' ? $elem[0].textContent : $elem[0].value, fin);
    });
  });
});

/**
 * Simula eventos de teclado
 * @param {boolean} onlyKey indica si la tecla se pulsa junto con la tecla "Alt" o sola
 * @param {string} key identificador de la tecla
 */
Cypress.Commands.add('keypress', (onlyKey, key) => {
  const rKey = key.replace(/^esc$/, '{esc}').replace(/^enter$/, '{enter}');
  const type = onlyKey ? rKey : ['Alt', rKey];
  cy.realPress(type);
});

/**
 * Comprueba si se hace una peticion "/json2pdf" a electron.
 * No comprueba si se genera un pdf
 * @param {function} command es el comando que debe llamar al generar pdf de la vista
 */
Cypress.Commands.add('interceptarGenerarPdf', (command = () => {}) => {
  const method = 'POST';
  const url = '**/json2pdf';
  cy.intercept(method, url, { respuesta: 'mock' }).as('generarPdf');
  command();
  cy.wait('@generarPdf')
    .its('response.statusCode')
    .should('eq', 200);
});

/**
 * Intercepta una peticion a electron para generar PDF y comprueba que nos devuelve un 200
 * @param {function} command es el comando que debe ejecutar la peticion de generar el pdf, por ejemplo el click de un botón
 * @param {function} method es el verbo con el que se va a interceptar la petición
 * @param {function} url es la url que se va ainterceptar la petición
 */
Cypress.Commands.add(
  'interceptarGenerarPdfElectron',
  ({ method = 'GET', url = '', command = () => {} }) => {
    cy.window().then(win => {
      cy.stub(win.electron.fs, 'createWriteStream').callsFake(() => ({
        end: () => true,
        write: () => true,
        read: () => true,
      }));
    });

    cy.intercept(method, url).as('generarPdfElectron');
    command();
    cy.wait('@generarPdfElectron')
      .its('response.statusCode')
      .should('eq', 200);
  }
);

Cypress.Commands.add('getPageTitle', (title, options = {}) => {
  cy.contains('#title', title, options);
});
