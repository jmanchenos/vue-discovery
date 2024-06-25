/**
 * @name validaOrdenTablaPorNumColumna
 * @description Acción que valida si una tabla esta ordenada por un nº de columna determinado en el orden solicitado
 * @param {string} tabla - id de la tabla
 * @param {string} indexColumna - alias del intercept usado
 * @param {boolean} orderAsc - true si orden ascendente  (default) o false si descendente
 * @param {string|function} sortFn - función de ordenacion a utilizar o string con valores predefinidos (date, numeric). Por defecto se utiliza ordenación alfabetica
 * @example cy.validaOrdenTablaPorNumColumna(tablaDevolucionesAsuntos, 0, true, 'date')
 */
Cypress.Commands.add('validaOrdenTablaPorNumColumna', (tabla, indexColumna, orderAsc = true, sortFn = '') => {
    // preparamos funciones de ordenacion
    const convertirFecha = texto => texto.split('/').reverse().join('/');
    const numerosAfter = texto =>
        texto
            .split('')
            .map(chr => {
                let charcode = chr.charCodeAt(0);
                if (48 <= charcode && charcode <= 57) {
                    return String.fromCharCode(charcode + 75);
                } else if (charcode > 122) {
                    return String.fromCharCode(charcode + 10);
                } else {
                    return chr;
                }
            })
            .join('') || String.fromCharCode(1000); // para que los valores nulos sean los ultimos
    const defSortFn = (a, b) => a.localeCompare(b);
    const sortFnNumeric = (a, b) => a.localeCompare(b, { numeric: true });
    const sortFnDate = (a, b) => defSortFn(convertirFecha(a), convertirFecha(b));
    const sortFnText2 = (a, b) => ([numerosAfter(a), numerosAfter(b)].sort()[0] === numerosAfter(a) ? -1 : 1); //
    let sortFnFinal;
    const sortFnTextOptions = {
        date: sortFnDate,
        numReg: sortFnDate,
        numeric: sortFnNumeric,
        text2: sortFnText2,
    };

    if (!sortFn) {
        sortFnFinal = defSortFn;
    } else if (typeof sortFn === 'string') {
        sortFnFinal = sortFnTextOptions[sortFn] || defSortFn;
    } else if (typeof sortFn === 'function') {
        sortFnFinal = sortFn;
    }

    //comenzamos la validacion
    cy.findByTestId(tabla)
        .find(`td.sg-table-body-column-${indexColumna}`)
        .then(tds => {
            const $valores = tds.toArray().map(td => td.innerText);
            const valoresOrdenados = $valores.sort(sortFnFinal);
            expect($valores).to.deep.equal(orderAsc ? valoresOrdenados : valoresOrdenados.reverse());
        });
});

/**
 * @name validarOrdenacionColumna
 * @description Acción que valida que funciona la ordenacion por columna al pulsar
 * sobre la misma y si la ordenación es correcta.
 * Tambien se usa para validar que una columna no es ordenable.
 * @param {string} tabla - id de la tabla
 * @param {string} nombreColumna - texto de la columna a buscar
 * @param {boolean} ordenable - true si la columna es ordenable y false si no
 * @param {string|function} sortFn - función de ordenacion a utilizar o string con valores predefinidos (date). Por defecto se utiliza ordenación alfabetica
 * @example cy.validarOrdenacionTabla('Nº Expediente', 'aliasCargaTabla', true)
 */
Cypress.Commands.add('validarOrdenacionColumna', (tabla, nombreColumna, ordenable = true, sortFn = '') => {
    cy.findByTestId(tabla)
        .findByRole('columnheader', { name: nombreColumna })
        .as('columna')
        .as('numColumna')
        .should(ordenable ? 'have.class' : 'not.have.class', 'sortable')
        .and('not.have.class', 'sorted');
    if (ordenable) {
        cy.log(`Ordenamos de forma ascendente por columna ${nombreColumna}`);
        cy.get('@columna').click();
        cy.findTable(tabla, { timeout: 6000 });
        cy.get('@columna')
            .should('have.class', 'sorted')
            .and('not.have.class', 'sort-desc')
            .then($columna => {
                cy.validaOrdenTablaPorNumColumna(tabla, $columna.index(), true, sortFn);
            });
        cy.log(`Ordenamos de forma descendente por columna ${nombreColumna}`);
        cy.get('@columna').click();
        cy.findTable(tabla, { timeout: 6000 });
        cy.get('@columna')
            .should('have.class', 'sort-desc')
            .then($columna => {
                cy.validaOrdenTablaPorNumColumna(tabla, $columna.index(), false, sortFn);
            });
    }
});

/**
 * @name validarRegistroEsSeleccionado
 * @description Acción y aserción valida si el registro pasado de entrada está seleccinado
 * o no seleccioando dependiendo si el atributo checkState es true o false
 * @param {string|number} args - indices de los registros o textos por los que buscar los registro, separados por comas
 *
 */
Cypress.Commands.add('validarRegistroEsSeleccionado', { prevSubject: true }, (subject, checkState, ...args) => {
    args.forEach(arg => {
        if (typeof arg === 'number') {
            cy.get(subject)
                .find(`tr.q-tr[data-row-selected=${arg}]`)
                .should('exist')
                .and(checkState ? 'have.class' : 'not.have.class', 'selected');
        } else if (typeof arg === 'string') {
            cy.get(subject)
                .find(`tr.q-tr[data-row-selected]`)
                .should(el => expect(el).to.have.length.greaterThan(0))
                .each(el => {
                    if (el[0].innerText?.includes(arg)) {
                        cy.wrap(el[0]).should(checkState ? 'have.class' : 'not.have.class', 'selected');
                    }
                });
        } else {
            cy.log('Argumento no válido');
        }
    });
});

/**
 * @name SeleccionarRegistros
 * @description Acción que selecciona los registros de una tabla. Simula hacer click sobre cada registro
 * @param {string|number} args - indices de los registros o textos por los que buscar los registros a seleccionar separados por comas
 *
 */
Cypress.Commands.add('seleccionarRegistros', { prevSubject: true }, (subject, ...args) => {
    args.forEach(arg => {
        if (typeof arg === 'number') {
            Cypress.$.each(subject.find(`[data-row-selected=${arg}]:not('.selected')`), (_index, el) => {
                cy.wrap(el).click();
                cy.log(`Registro ${arg} seleccionado`);
            });
        } else if (typeof arg === 'string') {
            Cypress.$.each(subject.find(`[data-row-selected]:not('.selected')`), (_index, el) => {
                if (el.innerText?.includes(arg)) {
                    cy.wrap(el).click();
                    cy.log(`Registro con texto ${arg} seleccionado`);
                }
            });
        } else {
            cy.log('Argumento no válido');
        }
    });
});

/**
 * @name checkRegistros
 * @description Acción que seleccionar el check-box de los registros de una tabla.
 * Simula hacer click sobre cada check-box de registro a seleccioonar
 * @param {string|number} args - indices de los registros o textos por los que buscar los registros a seleccionar separados por comas
 *
 */
Cypress.Commands.add('checkRegistros', { prevSubject: true }, (subject, ...args) => {
    args.forEach(arg => {
        if (typeof arg === 'number') {
            cy.get(subject).find(`tr.q-tr[data-row-selected=${arg}]`).find('.q-checkbox').click();
            cy.log(`Registro ${arg} seleccionado`);
        } else if (typeof arg === 'string') {
            cy.get(subject)
                .find(`tr.q-tr[data-row-selected]`)
                .should(el => expect(el).to.have.length.greaterThan(0))
                .each(el => {
                    if (el[0].innerText?.includes(arg)) {
                        cy.wrap(el[0]).find('.q-checkbox').click();
                        cy.log(`Registro con texto ${arg} seleccionado`);
                    }
                });
        } else {
            cy.log('Argumento no válido');
        }
    });
});

/**
 * @name checkRegistrosTabla
 * @description Acción que seleccionar el check-box de los registros de una tabla de entrada.
 * Simula hacer click sobre cada check-box de registro a seleccioonar
 * @param {string|number} dataCy - data-cy de la tabla
 * @param {string|number} args - indices de los registros o textos por los que buscar los registros a seleccionar separados por comas
 *
 */
Cypress.Commands.add('checkRegistrosTabla', (dataCy, ...args) => {
    cy.findByTestId(dataCy).checkRegistros(...args);
});

/**
 * @name findTableIcon
 * @description Acción que busca un icono dentro de una tabla
 * @param {string} icon    - nombre del icono
 * @param {string|number} options - objeto con diferentes propiedades de filtro:
 *                           - filter: filtro de iconos habilitados/deshabilitados (''(default), 'enabled', 'disabled')
 *                           - row: indica en que registro buscar (defecto 'first') [nº registro, 'first']
 * @returns - devuelve el subject del icono encontrado
 * */
Cypress.Commands.add(
    'findTableIcon',
    { prevSubject: true },
    (subject, icon, { actionIcon = true, filter = '', row = 'first' } = {}) => {
        const cyTabla = subject.attr('data-cy');
        let prefixQuery = row === 'first' ? '' : `[data-row-selected=${row}] `;
        let iconQuery = actionIcon ? `i[data-cy^="${cyTabla}"][data-cy$="${icon}"]` : `i.${icon}`;
        let fnFilterQuery = '';
        switch (filter) {
            case 'enabled':
                fnFilterQuery = actionIcon ? '[style*="cursor: pointer"]' : '[disable=false]';
                break;
            case 'disabled':
                fnFilterQuery = actionIcon ? '[style*="cursor: not-allowed"]' : '[disable=true]';
                break;
        }
        let query = `${prefixQuery}${iconQuery}${fnFilterQuery}`;
        const $el = subject.find(query);
        const numReg = $el[0]?.closest('[data-row-selected]')?.dataset?.rowSelected || '';
        Cypress.log({
            name: 'findTableIcon',
            message:
                $el.length > 0 ? `Icono ${icon} encontrado en la fila ${numReg}` : `No se ha encontrado icono ${icon}`,
            consoleProps: () => ({
                subject,
                yielded: $el[0]?.outerHTML || '',
                icon,
                row,
            }),
            $el,
        });
        cy.wrap($el[0] || null, { log: false });
    }
);

/**
 * @name getNumRegistros
 * @description Acción que recupera el n de registros de una tabla.
 * @returns num registros totales
 */
Cypress.Commands.add('getNumRegistros', { prevSubject: true }, subject => {
    cy.get(subject, { log: false }).then($el => {
        const numReg = $el[0].innerText.match(/Mostrando \d+-\d+ de (\d+)/)?.[1] || '0';
        cy.log(`nº registros es ${numReg}`);
        return cy.wrap(Number.parseInt(numReg), { log: false });
    });
});

/**
 *  @name findTable
 *  @description Acción que recupera el n de registros de una tabla.
 *  @params {string} dataCy - data-cy de la tabla
 *  @params {onbject} options - objeto con diferentes propiedades de filtro
 */
Cypress.Commands.add('findTable', (dataCy, options) => {
    cy.findByTestId(dataCy, options).should(table => {
        expect(table, 'La tabla no está cargándose').not.to.have.class('q-table--loading');
        const row = table.find(`[table-ref="${dataCy}"]`);
        if (row.length) {
            expect(row.first(), `la tabla tiene ${row.length} registros cargados`).to.be.visible;
        } else {
            const divNoData = table.find('.q-table__no-data');
            expect(divNoData, 'La tabla tiene registro(s)').to.have.length(1).and.be.visible;
        }
    });
});

/**
 * @name findTableIndexByFilter
 * @description Acción que recupera el índice de un registro de una tabla en base a un filtro.
 * @params {object} filtro - columnId: nombre del atributo del data-cy del campo
 *                         - value: valor del filtro
 */
Cypress.Commands.add('findTableIndexByFilter', { prevSubject: true }, (subject, columnId, value) => {
    const getCellIndex = cell => Number.parseInt(cell[0]?.dataset.cy.replace(dataCy, '').replace(columnId, '') || '-1');
    const findIndex = (tableSubject, lastIndexTreated = 0) => {
        const cells = tableSubject.find(`[data-cy^="${dataCy}"][data-cy$="${columnId}"]`);
        const filteredCells = cells.filter((i, el) => el.innerText === value);
        const lastIndex = getCellIndex(cells.last());
        if (filteredCells.length) {
            cy.wrap({ index: getCellIndex(filteredCells) }, { log: false }).as('index', { log: false });
        } else if (lastIndex < totalRegs - 1 && lastIndex > lastIndexTreated) {
            cy.wrap(cells.last()[0], { log: false })
                .scrollIntoView()
                .should(el => {
                    expect(getCellIndex(el).toString()).not.to.equal(lastIndex.toString());
                })
                .then(() => {
                    findIndex(tableSubject, lastIndex);
                });
        } else {
            cy.wrap({ index: -1 }, { log: false }).as('index', { log: false });
        }
    };

    const dataCy = subject.attr('data-cy');
    let totalRegs = 0;
    cy.wrap(subject, { log: false })
        .getNumRegistros()
        .then(numReg => {
            totalRegs = numReg;
            findIndex(subject, 0);
            cy.get('@index').then(({ index }) => {
                if (index === -1) {
                    cy.log(`No se ha encontrado el registro con el filtro ${columnId}=${value}`);
                } else {
                    cy.log(`El registro con el filtro ${columnId}=${value} está en la posición ${index}`);
                }
                cy.wrap(index, { log: false });
            });
        });
});

/**
 * @name scrollIntoIndex
 * @description Acción que hace scroll hasta un registro de una tabla
 * @param {number} index - índice del registro
 */
Cypress.Commands.add('scrollIntoIndex', { prevSubject: true }, (subject, index) => {
    const getIndex = el => parseInt(el[0].dataset.rowSelected || -1);
    const findAndScroll = () => {
        const regs = subject.find('[data-row-selected]');
        const lastIndex = getIndex(regs.last());
        if (lastIndex <= index) {
            cy.wrap(regs.last()[0], { log: false })
                .scrollIntoView()
                .should(el => {
                    expect(getIndex(el).toString()).not.to.equal(lastIndex.toString());
                })
                .then(() => {
                    findAndScroll();
                });
        } else {
            cy.wrap(subject.find(`[data-row-selected="${index}"]`), { log: false }).scrollIntoView();
        }
    };
    // Controlamos el nº de registros de la tabla
    if (index >= 0) {
        cy.wrap(subject, { log: false })
            .getNumRegistros()
            .then(numReg => {
                if (index < numReg) {
                    //Llamamos a la función recursiva
                    findAndScroll();
                } else {
                    cy.log(`El índice ${index} no es válido`);
                }
            });
    } else {
        cy.log(`El índice ${index} no es válido`);
    }
});
