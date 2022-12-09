describe('Caso de prueba Automático: NIG multimaterias en Contexto de Materia Simple.Tiene materia CGPJ y un NIG multimaterias', () => {
  //prueba ejecuta que no borre el localStorage en cada test
  before(() => {
    cy.configuration(false);
  });

  it('Se logea en la aplicación y navega a Asuntos', () => {
    cy.loginAplicacion();
  });

  it('Cerrar alertas', () => {
    cy.cerrarAlertas();
  });

  it('Selecciona orden contencioso', () => {
    cy.irContexto('CONTENCIOSO000CUENCA45');
    cy.irOrdenContencioso();
  });

  it('Ir a la registro Automático', () => {
    cy.irRegistroAutomatico();
    cy.recuperarStoreRegistroAutomatico();
  });

  it('Si no viene informado el campo materia CGPJ y un NIG multimaterias, no se carga nada en el campo Materia', () => {
    cy.itemNoMateriaCGPJNigMulti();
  });
});
