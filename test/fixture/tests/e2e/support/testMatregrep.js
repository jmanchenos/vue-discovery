let lengthMateriasInicioNig = 0;
let lengthMateriasVolver = 0;
let lengthMateriasDespuesBorrado = 0;
let zero = 0;
let numeroYearInput1 = 0;
let numeroYearInput2 = 0;
let materiasHeredadasNig = [];
let origenDelito = '';
let arrayDelitosHeredadasNig = [];
let materiasBorradasHeredadasNig = 0;
let valorCodigoDelito = '';
let nigValido = true;
let materiasNig = 0;

let store;
let hint = {};
let orden;
let tiOrgContexto;
let contextoActual;
let formProcedimiento;
let formRevision;
let materiaPrincipal;
let procedimientosMismoNig;
let delitosNig;
let valueCodigoDelito;
let rowSelectedOtherContext;
let tiUsuContexto;
let comboDestino;
let destino;


Cypress.Commands.add('recuperarStoreMatRegRep', () => {
  cy.window().its('app.$store').then(data => {
    store = data;
    contextoActual = store.state.auth.user.contextoActual;
    tiOrgContexto = contextoActual.tiOrg;
    tiUsuContexto = contextoActual.tiUsu;
  });
  cy.wait(2000);
});

const comprobarDeshabilitado = (dataCy, data) => {
  cy.get(`[data-cy=${dataCy}]`).then(item => {
    const isDisabled = item[0].disabled;
    if (!isDisabled) {
      cy.get(`[data-cy=${dataCy}]`).clear();
      cy.get(`[data-cy=${dataCy}]`)
        .type(data)
        .should('have.value', data);
    }
  });
};
Cypress.Commands.add('rellenarDatosNig', function(
  coPobNig,
  tiOrgNig,
  ordOrgNig,
  anAsuNig,
  nuAsuNig,
  indicadorNigValido
) {
  //TODO; añado un digito de mas porque con la clase input-class no se por qué, el primer digito lo elimina
  cy.inicializarNig();
  cy.intercept({
    method: 'GET',
    url: `/mtm-back-registro/api/no-pragma/asuntos/validarNIG?nig=${coPobNig}${tiOrgNig}${ordOrgNig}${anAsuNig}${nuAsuNig}`,
  }).as('NigAnio');
  cy.get('[data-cy="coPobNig"]')
    .type(coPobNig)
    .should('have.value', coPobNig);
  cy.wait(500);
  cy.get('[data-cy="tiOrgNig"]')
    .type(tiOrgNig)
    .should('be.visible')
    .and('have.value', tiOrgNig);
  cy.get('[data-cy="ordOrgNig"]')
    .type(ordOrgNig)
    .should('be.visible')
    .and('have.value', ordOrgNig);
  cy.get('[data-cy="anAsuNig"]')
    .type(anAsuNig)
    .should('be.visible')
    .and('have.value', anAsuNig);
  // al hacer el blur lanza las acciones del nig
  cy.get('[data-cy="nuAsuNig"]')
    .type(nuAsuNig)
    .blur();
  //escucho peticiones http
  // si el nig es valido preparo la llamada para cuando se ejecute en la página, pueda interceptar la llamada y poder recuperar los datos
  // con el comando @wait(completeNig)
  //obtengo materias por nig
  if (indicadorNigValido) {
    let contextPeticionHttp = '';
    let contextoDefecto = '';
    if (contextoActual) {
      const { coPob, tiOrg, coOrd } = contextoActual;
      contextPeticionHttp = `${coPob}${tiOrg}000${coOrd}${tiUsuContexto}`;
    } else {
      contextoDefecto = `${coPobNig}${tiOrgNig}000${ordOrgNig}${tiUsuContexto}`;
    }
    const contextoRuta = contextPeticionHttp || contextoDefecto;
    cy.intercept({
      method: 'GET',
      // url: `/mtm-back-consultas-general/api/no-pragma/v1/16078510002SE/materias/asunto?coPob=${coPobNig}&tiOrg=${tiOrgNig}&coOrd=${ordOrgNig}&nuAsu=${nuAsuNig}&anAsu=${anAsuNig}&coProcon=`
      url: `/mtm-back-consultas-general-atom/api/consulta-materias-asunto/no-pragma/${contextoRuta}?coPob=${coPobNig}&tiOrg=${tiOrgNig}&coOrd=${ordOrgNig}&nuAsu=${nuAsuNig}&anAsu=${anAsuNig}&coProcon=`,
    }).as('completeNig');
  }
  cy.intercept({
    method: 'GET',
    url: '/mtm-back-consultas-general-atom/api/consulta-procedimientos-x-asunto/no-pragma*',
  }).as('procedimientosMismoNig');
  if (indicadorNigValido) {
    cy.wait('@completeNig').then(xhr => {
      // you can read the full response from `xhr.response.body`
      materiasNig = xhr.response.body.content;
      const delitosLength = materiasNig.length || 0;
      if (delitosLength >= 1) {
        cy.get('[data-cy="numero"]').then($span => {
          let lengthMateriasInicioNig = parseInt($span.text());
          expect(lengthMateriasInicioNig).to.equal(parseInt(delitosLength));
        });
      }
      materiasHeredadasNig = materiasNig.map(materia => {
        let heredado = Object.assign(materia, { heredado: true });
        return heredado;
      });
    });
  }

  // espera a ser ejecutado el servicio de validarNig
  cy.wait('@NigAnio').then(xhr => {
    // you can read the full response from `xhr.response.body`
    nigValido = xhr.response.body.content.valido;
    expect(nigValido).to.equal(indicadorNigValido);
  });

  //si el nig es valido y tiene materias
  if (materiasNig.length) {
    cy.get('[data-cy="numero"]').then($span => {
      lengthMateriasInicioNig = $span.text();
    });
  }
  cy.get('[data-cy="codigoDelito"]').then(valorInput => {
    materiaPrincipal = valorInput.val();
  });
});

Cypress.Commands.add('abreModalMaterias', function() {
  cy.wait(2000);
  cy.get('[data-cy="buttonMaterias"]').click({ force: true });
  cy.wait(2000);
});

Cypress.Commands.add('seleccionDelito', delito => {
  cy.get('[data-cy="codigoDelito"]')
    .type(delito)
    .should('be.visible')
    .and('have.value', delito);
});

Cypress.Commands.add('aniadirDelitos', function(delito) {
  //Comprueba que si es no eliminable no deberia mostrar el boton de borrado
  materiasHeredadasNig.forEach((item, index) => {
    const indexArray = valueCodigoDelito === '' ? index : index + 1;
    if (!item.eliminable) cy.get(`materiasTable${indexArray}Icon`).should('not.be.visible');
    //if (!item.seleccionable) cy.get(`[data-row-selected=${index}]`).find('i').should('not.be.visible')
    if (!item.seleccionable) {
      cy.get(`[data-row-selected=${indexArray}]`)
        .find('i')
        .first()
        .should('have.class', 'text-negative');
    }
  });
  cy.get('[data-cy="aceptarModalMaterias"]').click();
  cy.wait(2000);
  //cy.get('[data-cy="confirmConfirmacionSalidaAceptar"]').click({force});
  cy.get('[data-cy="codigoDelito"]').clear({ force: true });
  cy.get('[data-cy="codigoDelito"]')
    .type(delito, { force: true })
    .should('be.visible')
    .and('have.value', delito);
});

Cypress.Commands.add('elimina_delitos_insertados_anteriormente', function() {
  //let lengthMateriasDespuesBorrado = 0;
  cy.wait(1000);
  cy.get('[data-cy="buttonMaterias"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="materiasTable0icon-borrar"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="confirmEliminarPrincipalAceptar"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="aceptarModalMaterias"]').click({ force: true });
  cy.get('[data-cy="confirmConfirmacionSalidaAceptar"]').click({ force: true });
  cy.wait(1000);
  let materiasNigInicial = String(materiasNig.length);
  cy.get('[data-cy="numero"]').then($span => {
    lengthMateriasDespuesBorrado = $span.text();
    cy.wait(1000);
    //cuando se borre tiene que tener la misma longitud que inicialmente, sino fallaria
    expect(materiasNigInicial).to.equal(lengthMateriasDespuesBorrado);
  });
});

Cypress.Commands.add('eliminaDelitoPrincipal', function() {
  cy.wait(1000);
  cy.get('[data-cy="buttonMaterias"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="materiasTable0icon-borrar"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="confirmEliminarPrincipalAceptar"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="aceptarModalMaterias"]').click({ force: true });
  cy.get('[data-cy="confirmConfirmacionSalidaAceptar"]').click({ force: true });
});

Cypress.Commands.add('resgistrarSinDelito', function(claseReparto) {
  cy.get('[data-cy="claseReparto"]')
    .type(claseReparto)
    .should('be.visible')
    .and('have.value', claseReparto);
  cy.get('[data-cy="btnReg"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="codigoDelito"]')
    .parents('label')
    .should('have.class', 'q-field--error');
});

Cypress.Commands.add('cierraPantallaAsuntos', function() {
  cy.get('[data-cy="btnClose"]').click({ force: true });
  cy.wait(500);
  cy.get('[data-cy="confirmCancelarAceptar"]').click({ force: true });
});

Cypress.Commands.add('senalarDelitoOtroContexto', function() {
  let itemTablaMaterias = '';
  materiasHeredadasNig.find((item, index) => {
    if (item.tiOrgMateria !== tiOrgContexto && item.seleccionable) {
      rowSelectedOtherContext = materiasHeredadasNig[index];
      itemTablaMaterias = `materiasTable${index}Origen`;
      return;
    }
  });
  //cy.get(`[data-cy=${itemTablaMaterias}]`).click({force:true});
  cy.get(`[data-cy=${itemTablaMaterias}]`)
    .click({ force: true })
    .then(item => {
      //nos guardamos el origen del delito si es del contexto(Actual) o es de otro contexto
      origenDelito = item.text();
    });
  cy.wait(1000);
  cy.get('[data-cy="aceptarModalMaterias"]').click({ force: true });
});

Cypress.Commands.add('senalarDelitoMismoContexto', function() {
  let itemTablaMaterias = '';
  materiasHeredadasNig.find((item, index) => {
    if (item.tiOrgMateria === tiOrgContexto && item.seleccionable) {
      rowSelectedOtherContext = materiasHeredadasNig[index];
      itemTablaMaterias = `materiasTable${index}Origen`;
      return;
    }
  });
  cy.get(`[data-cy=${itemTablaMaterias}]`)
    .click()
    .then(item => {
      //nos guardamos el origen del delito si es del contexto(Actual) o es de otro contexto
      origenDelito = item.text();
    });
  cy.wait(1000);
  cy.get('[data-cy="aceptarModalMaterias"]').click();
  cy.get('[data-cy="clasesRepartoAsocCancelar"]').click();
});

Cypress.Commands.add('borrar_nig_borrar_delitos_heredados', function() {
  let numeroDelito;
  cy.get('[data-cy="coPobNig"]').clear();
  cy.wait(1000);
  cy.get('body').then($body => {
    if ($body.find('[data-cy="numero"]').length > 0) {
      numeroDelito = parseInt($body.find('[data-cy="numero"]').text());
    } else {
      numeroDelito = zero;
    }
    if (origenDelito === 'Actual') {
      if (rowSelectedOtherContext.coDel === valueCodigoDelito) expect(numeroDelito).to.equal(0);
      else expect(numeroDelito).to.equal(1);
    } else {
      if (rowSelectedOtherContext.coDel === valueCodigoDelito) expect(numeroDelito).to.equal(0);
      else expect(numeroDelito).to.equal(1);
    }
  });
});

Cypress.Commands.add('rellenarDelito', (delito, claseRegistro, claseReparto) => {
  cy.get('[data-cy="codigoDelito"]').clear();
  cy.get('[data-cy="codigoDelito"]')
    .type(delito)
    .should('be.visible')
    .and('have.value', delito);
  cy.get('[data-cy="clasesRepartoAsocCancelar"]').click({ force: true });
  cy.get('[data-cy="codigoClaseRegistro"]')
    .type(claseRegistro)
    .should('be.visible')
    .and('have.value', claseRegistro);
  cy.wait(1000);
  cy.get('[data-cy="clasesRepartoAsocCancelar"]').click({ force: true });
  cy.get('[data-cy="claseReparto"]').clear({ force: true });
  cy.get('[data-cy="claseReparto"]')
    .type(claseReparto)
    .should('be.visible')
    .and('have.value', claseReparto);
  cy.get('[data-cy="btnReg"]').click({ force: true });
  cy.get('[data-cy="confirmPreRegistroAceptar"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="codigoClaseRegistro"]')
    .focus()
    .tab();
  cy.wait(1000);
  cy.compruebaMuestraMensajeNotificacion(
    'No existe relación entre la clase de registro y la clase de reparto'
  );
});

Cypress.Commands.add('pre_registra_formulario', (delito, claseRegistro) => {
  cy.get('[data-cy="codigoDelito"]').clear();
  cy.get('[data-cy="codigoDelito"]')
    .type(delito)
    .should('be.visible')
    .and('have.value', delito);
  cy.get('[data-cy="clasesRepartoAsocCancelar"]').click();
  cy.get('[data-cy="codigoClaseRegistro"]')
    .type(claseRegistro)
    .should('be.visible')
    .and('have.value', claseRegistro);
  cy.get('[data-cy="clasesRepartoAsocCancelar"]').click();
  cy.get('[data-cy="btnReg"]').click({ force: true });
  cy.get('[data-cy="confirmPreRegistroAceptar"]').click({ force: true });
  cy.wait(2000);
  cy.get('[data-cy="numeroYearInput1"]').then($span => {
    numeroYearInput1 = $span.val();
    expect(numeroYearInput1).to.not.equal('');
  });
  cy.get('[data-cy="numeroYearInput2"]').then($span => {
    numeroYearInput2 = $span.val();
    expect(numeroYearInput2).to.not.equal('');
  });
  cy.get('[data-cy="btnClose"]').click({ force: true });
  cy.get('[data-cy="confirmCancelarAceptar"]').click({ force: true });
  cy.get('[data-cy="cancelarRegistro"]').click({ force: true });
});

Cypress.Commands.add('compruebaNoMuestraMensajeErrorClaseRegistroVsClaseReparto', notification => {
  expect('.q-notifications').not.contains(notification);
});

Cypress.Commands.add('navegaPantallaOrigenyVuelveAsuntos', () => {
  let numeroDelito = '';
  let numeroDelitoRegresarPantalla = '';
  cy.get('[data-cy="numero"]').then($span => {
    numeroDelito = $span.text();
  });
  cy.get('[data-cy="btnExpOri"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="btnVolver"]').click({ force: true });
  cy.get('[data-cy="numero"]').then($span => {
    numeroDelitoRegresarPantalla = $span.text();
    cy.wait(1000);
    expect(numeroDelito).to.equal(numeroDelitoRegresarPantalla);
  });
});

Cypress.Commands.add('borrarMateriasPermitidas', () => {
  //Para poder borrar las materias heredadas que se pueden borrar, el problema que se tiene es que cuando se borra una materia, se reordena,
  // por lo que si inicialmente por ejemplo los delitos borrables eran los item 6 y 8, cambia y hay que buscar en el DOM la nueva posicion
  // de la materia a borrar
  cy.get('[data-cy="numero"]').then($span => {
    lengthMateriasInicioNig = $span.text();
  });

  const lenghtIconsDelete = materiasHeredadasNig.filter(element => element.eliminable).length;
  materiasBorradasHeredadasNig = 0;
  for (let i = 0; i < lenghtIconsDelete; i++) {
    cy.wait(1000);
    cy.get('[data-event-name="evtDelete"]').then(listIconsDelete => {
      for (let i = 0; i < listIconsDelete.length; i++) {
        if (listIconsDelete[i].style.display !== 'none') {
          listIconsDelete[i].click({ force: true });
          cy.wait(1000);
          cy.get('[data-cy="confirmEliminarPrincipalAceptar"]').click({ force: true });
          materiasBorradasHeredadasNig++;
          return;
        }
      }
    });
  }
  cy.get('[data-cy="aceptarModalMaterias"]').click({ force: true });
  cy.get('[data-cy="confirmConfirmacionSalidaAceptar"]').click({ force: true });
});

Cypress.Commands.add('abandonaPantallaAndReturn', () => {
  cy.wait(1000);
  cy.get('[data-cy="numero"]').then($span => {
    lengthMateriasDespuesBorrado = $span.text();
    cy.wait(1000);
    //cuando se borren las materias NO tiene que tener la misma longitud que inicialmente
    if (materiasBorradasHeredadasNig)
      expect(lengthMateriasInicioNig).not.to.equal(lengthMateriasDespuesBorrado);
    else expect(lengthMateriasInicioNig).to.equal(lengthMateriasDespuesBorrado);
  });
  cy.get('[data-cy="btnExpOri"]').click({ force: true });
  cy.wait(500);
  cy.get('[data-cy="btnVolver"]').click({ force: true });
});

Cypress.Commands.add('comprobarNoHayMateriasPrincipales', function() {
  materiasHeredadasNig.forEach((item, index) => {
    if (!item.principal && item.eliminable)
      cy.get(`[data-cy="materiasTable${index}icon-borrar"]`).should(
        'not.have.css',
        'display',
        'none'
      );
    else
      cy.get(`[data-cy="materiasTable${index}icon-borrar"]`).should('have.css', 'display', 'none');
  });
});

Cypress.Commands.add('comprobarNoHayMateriasEliminable', () => {
  cy.get('[data-cy="numero"]')?.then($span => {
    lengthMateriasVolver = $span.text();
  });

  cy.get('[data-cy="buttonMaterias"]')
    .click({ force: true })
    ?.then(() => {
      //comprueba que el numero de materias tiene que ser igual al abandonar la pantalla y al volver
      expect(lengthMateriasVolver).to.equal(lengthMateriasDespuesBorrado);
      cy.wait(3000);
      cy.get('[data-event-name="evtDelete"]')?.then(listIconsDelete => {
        let isThereDisplayNode = true;
        for (let i = 0; i < listIconsDelete.length; i++) {
          if (listIconsDelete[i].style.display !== 'none') {
            isThereDisplayNode = false;
            return;
          }
        }
        expect(isThereDisplayNode).to.be.true;
      });
    });
});

Cypress.Commands.add('borraDigitoInputMaterias', () => {
  cy.get('[data-cy="codigoDelito"]')
    .type('{end}{backspace}')
    .then(valorInput => {
      cy.get('[data-cy="codigoClaseRegistro"]').click({ force: true });
    });
  cy.get('[data-cy="codigoDelito"]').then(valorInput => {
    valorCodigoDelito = valorInput.val();
    expect(valorCodigoDelito).to.equal('');
  });
});

Cypress.Commands.add('senalarOtroDelitoCancelar', () => {
  let valorCodigoDelitoCancelar;
  cy.wait(1000);
  cy.get('[data-cy="codigoDelito"]').then(valorInput => {
    valorCodigoDelito = valorInput.val();
  });
  cy.wait(1000);
  cy.get('[data-cy="materiasTable1Origen"]').click({ force: true });
  cy.wait(1000);
  cy.get('[data-cy="cancelarModalMaterias"]').click({ force: true });
  cy.get('[data-cy="codigoDelito"]').then(valorInput => {
    valorCodigoDelitoCancelar = valorInput.val();
    expect(valorCodigoDelitoCancelar).to.equal(valorCodigoDelito);
  });
});

Cypress.Commands.add('rellenarDelitoCompruebaClaseRepartoDestino', delito => {
  let valorClaseReparto = '';
  let valorDestino = '';
  let setOrganoDestinoDefecto = false;
  cy.intercept({
    method: 'GET',
    url: `**/mtm-back-consultas-general-atom/api/consulta-organos-x-clases-reparto/no-pragma/**`,
  }).as('comboDestino');
  debugger;
  cy.get('[data-cy="codigoDelito"]').clear();
  cy.get('[data-cy="codigoDelito"]').type(delito);

  cy.wait('@comboDestino').then(xhr => {
    debugger;
    destino = xhr.response.body;
    if (destino?.content)
      setOrganoDestinoDefecto = destino.content?.organos.some(item => item.defecto === true);
    cy.wait(1000);
    cy.get('[data-cy="claseReparto"]').then(valor => {
      valorClaseReparto = valor.val();
      expect(valorClaseReparto).not.to.equal('');
    });
    cy.get('[data-cy="organoDestino"]').then(valor => {
      valorDestino = valor.text();
      if (setOrganoDestinoDefecto) expect(valorDestino).not.to.equal('');
      else expect(valorDestino).to.equal('');
    });
  });
});

Cypress.Commands.add('rellenarDelitoClaseReparto', (delito1, delito2, delito3, claseReparto) => {
  cy.get('[data-cy="codigoDelito"]').clear();
  cy.get('[data-cy="codigoDelito"]').type(delito1);
  cy.wait(1000);
  cy.get('[data-cy="codigoDelito"]').clear();
  cy.get('[data-cy="codigoDelito"]').type(delito2);
  cy.wait(1000);
  cy.get('div').should('have.class', 'SgModal');
  cy.wait(1000);
  cy.get('[data-cy="clasesRepartoAsoc"]')
    .find('input')
    .eq(0)
    .click({ force: true });
  cy.get('[data-cy="clasesRepartoAsocAceptar"]').click({ force: true });
  cy.get('[data-cy="claseReparto"]').should('have.value', claseReparto);
  cy.get('[data-cy="codigoDelito"]').clear();
  cy.get('[data-cy="codigoDelito"]').type(delito3);
  cy.get('[data-cy="claseReparto"]').should('have.value', claseReparto);
});

Cypress.Commands.add(
  'rellenarDelitoConclaseRepartoAsignadaModificandoDelito',
  (delito, claseReparto, claseRegistro) => {
    cy.get('[data-cy="codigoDelito"]').type(delito);
    cy.get('[data-cy="claseReparto"]').should('have.value', claseReparto);
    cy.get('[data-cy="codigoClaseRegistro"]').type(claseRegistro);
    cy.compruebaMuestraMensajeNotificacion(
      'No existe relación entre la clase de registro y la clase de reparto'
    );
    cy.get('div').should('have.class', 'SgModal');
    cy.get('[data-cy="clasesRepartoAsocCancelar"]').click();
  }
);

Cypress.Commands.add(
  'revisionDelitoConClaseRepartoAsociada',
  (delito, claseReparto, claseRegistro) => {
    cy.intercept({
      method: 'GET',
      url: '**/mtm-back-registro/api/no-pragma/v2/procedimientos/principal/formulario/*',
    }).as('formularioRevision');
    cy.get('[data-cy="clasesRepartoAsocCancelar"]').click();
    cy.wait('@formularioRevision').then(xhr => {
      formRevision = xhr.response.body;
      const modificable = formRevision._hint?.modificable ?? false;
      cy.wait(2000);
      cy.get('div').should('have.class', 'SgModal');
      cy.get('[data-cy="clasesRepartoAsocCancelar"]').click();
      cy.compruebaMuestraMensajeNotificacion(
        'No existe relación entre la clase de registro y la clase de reparto'
      );
      if (!modificable) cy.get('[data-cy="accept"]').click();
      comprobarDeshabilitado('codigoDelito', delito);
      cy.get('[data-cy="claseReparto"]').should('have.value', claseReparto);
      comprobarDeshabilitado('codigoClaseRegistro', claseRegistro);
    });
  }
);

Cypress.Commands.add('compruebaClasesReparto_y_Destino_Deshabilitados', () => {
  cy.get('[data-cy="claseReparto"]').should('be.disabled');
  // cy.get('[data-cy="organoDestino"]').children('span').should('have.class', 'q-field--disabled')
});

Cypress.Commands.add('inicializarNig', () => {
  cy.get('[data-cy="coPobNig"]').clear();
});

Cypress.Commands.add('cerrarAlertas', () => {
  cy.get('[data-cy="cerrarAlertas"]').click({ multiple: true, force: true });
});

Cypress.Commands.add('IrAsuntosContencioso', () => {
  cy.intercept({
    method: 'GET',
    url: '/mtm-back-registro/api/no-pragma/v2/procedimientos/principal/formulario/no-id',
  }).as('formularioProcedimiento');

  cy.get('[data-cy="aceptarRegistro"]').click();

  cy.wait('@formularioProcedimiento').then(xhr => {
    // you can read the full response from `xhr.response.body`
    formProcedimiento = xhr.response.body;
  });
});

Cypress.Commands.add('comprobarMateriaPrincipalContextoMateriaSimple', function() {
  /*
    Si el contexto logado es materia simple y el nig consultado posee multimaterias(varios delitos),se tiene que pintar el delito
    primero que sea del contexto logado y comprobar que sea editable.
  */
  const multidelito = formProcedimiento._hint?.MULTIDELITO ?? false;
  if (!multidelito) {
    const delitoContencioso = materiasHeredadasNig.find(item => item.coincide === true);
    expect(materiaPrincipal).to.equal(delitoContencioso.coDel);
  }
});

Cypress.Commands.add('rellenarDelitoViolenciaDomestica', (delito, tipificacion) => {
  cy.get('[data-cy="codigoDelito"]').clear();
  cy.get('[data-cy="codigoDelito"]').type(delito);
  cy.get(`div[aria-label="${tipificacion}"]`).then(item => {
    expect(Boolean(item[0].ariaChecked)).to.equal(true);
    const isDisabled = parseInt(item[0].className.indexOf('disabled'));
    const notFound = -1;
    expect(isDisabled).to.not.equal(notFound);
  });
});

Cypress.Commands.add('addDelitoMateria', (delito, tipificaciones) => {
  cy.get('[data-cy="inputArbolDelitosMaterias"]').type(delito);
  const selectDelito = cy.get('[data-cy="arbol"]').find('[class="q-tree__node-collapsible"]');
  selectDelito
    .find('[role="checkbox"]')
    .first()
    .click({ force: true });
  cy.wait(1000);
  const itemSeletectedTable = cy
    .get('[data-cy="materiasTable"]')
    .find('[class="q-virtual-scroll__content"]');
  itemSeletectedTable.get('[data-cy="materiasTable1Código"]').click({ force: true });
  cy.get('[data-cy="aceptarModalMaterias"]').click({ force: true });
  cy.get(`div[aria-label="${tipificaciones}"]`).then(item => {
    expect(Boolean(item[0].ariaChecked)).to.equal(true);
    const isDisabled = parseInt(item[0].className.indexOf('disabled'));
    const notFound = -1;
    expect(isDisabled).to.equal(notFound);
  });
});
Cypress.Commands.add(
  'procedimientoOrigen',
  (poblacion, tipoOrgano, numeroOrgano, claseProcedimiento, number, year) => {
    cy.get('[data-cy="codigoPoblacionSelectorOrgano"]')
      .type(poblacion)
      .should('have.value', poblacion);
    cy.wait(1000);
    cy.get('[data-cy="tipoOrganoSelectorOrgano"]')
      .type(tipoOrgano)
      .should('be.visible')
      .and('have.value', tipoOrgano);
    cy.get('[data-cy="numeroOrganoSelectorOrgano"]')
      .type(numeroOrgano)
      .should('have.value', numeroOrgano)
      .then(() => {
        cy.wait(1000);
        cy.get('[data-cy="claseProcedimiento"]')
          .type(claseProcedimiento, { force: true })
          .should('have.value', claseProcedimiento);
        cy.get('[data-cy="numeroAnyoInput1"]')
          .type(number, { force: true })
          .should('have.value', number);
        cy.get('[data-cy="numeroAnyoInput2"]')
          .type(year, { force: true })
          .should('have.value', year);
      });

    cy.intercept({
      method: 'GET',
      url:
        '/mtm-back-consultas-general/api/no-pragma/procedimiento/mismoNIG?nig=1607851220180000404&soloContador=true',
    }).as('procedimientosMismoNig');

    cy.intercept({
      method: 'GET',
      // url: '/mtm-back-consultas-general/api/no-pragma/v1/16078510002SE/materias/asunto?coPob=16078&tiOrg=51&coOrd=2&nuAsu=0000404&anAsu=2018&coProcon='
      url: '**/mtm-back-consultas-general/api/no-pragma/v1/16078510002SE/materias/asunto*',
    }).as('delitosNig');

    cy.wait(3000);
    cy.get('[data-cy="botonNotifications"]')
      .click({ force: true })
      .then(() => {
        cy.wait(1000);
        const notificacionNig = 'Se ha establecido el NIG del procedimiento origen como NIG actual';
        cy.get('[data-cy="itemNotification0"]').then(item => {
          const value = item[0].innerText;
          expect(value).to.equal(notificacionNig);
        });
        //const delitoMateria = 'Se ha establecido el delito/materia del procedimiento origen como delito/materia actual'
        //const delitoMateriaDefecto = 'El delito/materia introducido no coincide con el del procedimiento origen: 20101'
        //expect mensajes notificaciones
        // cy.get('[data-cy="itemNotification0"]').then(item=>{
        //   const value = item[0].innerText;
        //   expect(value).to.equal(valueCodigoDelito !== '' ? delitoMateriaDefecto : delitoMateria)
        // })

        // cy.get('[data-cy="itemNotification1"]').then(item=>{
        //   const value = item[0].innerText;
        //   expect(value).to.equal(notificacionNig)
        // })
        cy.get('[data-cy="cerrarAlertas"]').click({ force: true });
      });
    cy.wait('@delitosNig').then(xhr => {
      delitosNig = xhr.response.body;
      const delitosLength = delitosNig?.content?.length || 0;
      cy.get('[data-cy="numero"]').then($span => {
        let lengthMateriasInicioNig = parseInt($span.text());
        expect(lengthMateriasInicioNig).to.equal(parseInt(delitosLength));
      });
    });

    cy.wait('@procedimientosMismoNig').then(xhr => {
      procedimientosMismoNig = xhr.response.body;
      cy.get('[data-cy="nigValidoBtn"]').then($span => {
        let lengthMismoNig = parseInt($span.text());
        expect(lengthMismoNig).to.equal(parseInt(procedimientosMismoNig.total));
      });
    });
  }
);
Cypress.Commands.add('comprobarRellenoMateriaDefecto', () => {
  cy.get(`[data-cy="codigoDelito"]`).then(valorInput => {
    valueCodigoDelito = valorInput[0]._value;
  });
});
Cypress.Commands.add('traerProcedimientosNig', () => {
  cy.wait('@procedimientosMismoNig').then(xhr => {
    procedimientosMismoNig = xhr.response.body;
    cy.get('[data-cy="nigValidoBtn"]').then($span => {
      let lengthMismoNig = parseInt($span.text());
      expect(lengthMismoNig).to.equal(parseInt(procedimientosMismoNig.total));
    });
  });
  cy.get('[data-cy="nigValidoBtn"]').click();
  cy.get('[data-cy="btnClose"]').click();
});

// Cypress.Commands.add('irAsuntosMatregrep', () => {
//   cy.intercept({
//     method: "GET",
//     //url: `**/mtm-back-consultas-general/api/no-pragma/v1/${contextoRuta}/organos/reparto/destino*`
//     // url: `**/mtm-back-consultas-general-atom/api/no-pragma/${contextoRuta}/organos/reparto/destino*`
//     url: `**/mtm-back-consultas-general-atom/api/consulta-organos-x-clases-reparto/no-pragma/*`
//   }).as('comboDestino');
//   cy.get('[data-cy="aceptarRegistro"]').click();
//   cy.wait('@comboDestino').then(xhr => {
//     comboDestino = xhr.response.body;
//   })
// });
