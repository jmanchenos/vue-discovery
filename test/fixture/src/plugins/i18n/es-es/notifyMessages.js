const notifyMessages = {
    access: 'Accediendo...',
    acontecimientoNoActualizado: 'Acontecimiento no actualizado:',
    actualizaEstadoAcontecimiento: 'Se ha actualizado el estado de cumplimentación en 1 acontecimiento, ',
    actualizaEstadosAcontecimientos: 'Se ha actualizado el estado de cumplimentación en {n1} acontecimientos, ',
    asuntoImposibleDevolver: 'El asunto indicado no puede ser devuelto',
    commonErrorCounter: '{numero} {campo} no se han {accion}',
    commonErrorOneCounter: '{numero} {campo} no se ha {accion}',
    commonSuccess: '{campo} {accion} correctamente',
    commonSuccessCounter: '{numero} {campo} {accion} correctamente',
    create: 'Cargando {campo}...',
    createOK: '{campo} dado de alta correctamente',
    createOKFem: '{campo} dada de alta correctamente',
    createRelacionOk: 'Relación dada de alta correctamente',
    delete: 'Eliminando {campo}...',
    deleteOK: '{campo} eliminado correctamente',
    deleteOKFem: '{campo} eliminada correctamente',
    devolucionOK: 'Se ha ejecutado correctamente la devolución',
    devolucionProcedimientoPiezasRecursos:
        'Las piezas separadas y recursos interpuestos quedarán finalizadas tras la devolución',
    envioAgendaWebOk: 'Se ha enviado el apunte a la agenda correctamente',
    envioAgendaWebError: 'Se ha producido un error al enviar el apunte a la agenda',
    errorCargarPagina: 'Error en la carga de la página',
    errorDescargarDocumento: 'Error, no se pudo descargar el documento',
    excluyenIntervinientes:
        'Se excluyen los actos de comunicación de aquellos intervinientes que se encuentran en estado de Recibido',
    executeDevolucion: 'Ejecutando devolución',
    finalize: 'Finalizando {campo}...',
    finalizeOK: '{campo} finalizado correctamente',
    finalizeOperation: 'Operación finalizada con éxito',
    fueronSeleccionados: 'de los {n2} que fueron seleccionados.',
    fueSeleccionado: 'de 1 que fue seleccionado.',
    infoSinDocumentos: 'El escrito debe tener al menos un documento',
    inicializarCargasClaseReparto: 'Inicializando clase de reparto...',
    inicializarCargasClaseRepartoKO: 'La clase de Reparto no ha podido inicializarse',
    inicializarCargasClaseRepartoOK: 'Clase de Reparto inicializada correctamente',
    load: 'Cargando {campo}...',
    messageDebeSeleccionarDocumento: 'Debe seleccionar algún documento',
    messageDebeSeleccionarResolucion: 'Debe seleccionar una resolución',
    messageErrorUrlMapaAsunto: 'No se puede cargar el mapa del asunto',
    msgAcontecimientosActualizados: '{msgError}',
    msgApunteAgendaPlazos: '¿Desea realizar el apunte libre en la agenda de plazos con estos datos?',
    msgApunteAgendaPlazosOk: 'Se ha creado el apunte en la agenda de plazos correctamente',
    msgApunteAgendaPlazosYaExiste:
        'Ya existen Apuntes Libres en la Agenda de plazos para este procedimiento, ¿Desea añadir otro Apunte Libre?',
    msgAsigClaseRepartoParticular: '¿Asignar la Clase {coClaseRep} a algún/os Órgano/s en particular ?',
    msgCodigoClaseRepartoExistente: 'Código de Clase de Reparto ya existente',
    msgDelitosRelacionados:
        'Hay {campo} relacionadas o que se pueda/n relacionar con la CLASE de REPARTO dada, ¿Desea modificarlos?',
    msgKoActualizadosAgenda: 'No se pudo actualizar el estado apuntes agenda',
    msgModificarAsigOrganosAdscritos: '¿Modificar la asignación de clase {coClaseRep} a los órganos adscritos?',
    msgOkActualizadosAgenda:
        '{procedimiento} acont. {acont}: Se ha actualizado el estado apuntes agenda del procedimiento.',
    msgSinPermisoSecretoSumario: 'Procedimiento en Secreto de Actuaciones, no tiene los permisos requeridos',
    msgUnoApuntesActualizarAgenda: `<b>{procedimiento}</b> <b>acont.{acont}</b>.
  El acontecimiento cumplimentado, tiene un apunte en la agenda de plazos con:<br>
  <b>Fecha de notificación</b>: {fechaNotificacionApunte}<br>
  <b>Fecha límite</b>: {fechaLimiteApunte}<br>
  <b>Usuario de creación</b>:  {usuarioCreacionApunte}<br>
  ¿Desea actualizar también el apunte de la agenda de plazos a estado Cumplimentado?`,
    msgUnoApuntesActualizarAgendaSinProcedimiento: `El acontecimiento cumplimentado, tiene un apunte en la agenda de plazos con:<br>
  <b>Fecha de notificación</b>: {fechaNotificacionApunte}<br>
  <b>Fecha límite</b>: {fechaLimiteApunte}<br>
  <b>Usuario de creación</b>:  {usuarioCreacionApunte}<br>
  ¿Desea actualizar también el apunte de la agenda de plazos a estado Cumplimentado?`,
    msgVariosApuntesActualizarAgenda: `Existen apuntes en la agenda para varios de los acontecimientos que se han cumplimentado.
  ¿Desea actualizar también los apuntes de las agenda de plazos a estado Cumplimentado ?`,
    noCoincideDelitoOrigen: 'El delito/materia introducido no coincide con el del procedimiento origen: {delito}',
    noCoincideNigOrigen: 'El NIG introducido no coincide con el del procedimiento origen: {nig}',
    noEnvioApunteAgenda: 'No se ha podido enviar el apunte a la agenda',
    noHayDocumentoEscaneado: 'No hay ningun documento escaneado',
    noHaySituacionesOrgSelec: 'No se encuentran situaciones para el órgano seleccionado',
    personacionesPendientes:
        'Existen personaciones pendientes para el origen seleccionado o por coincidencia con intervinientes',
    preRegister: 'Realizando pre-registro...',
    printPDFFilters: 'El número de resultados es demasiado alto. Por favor, introduzca más filtros',
    procedimientoExistList: 'El procedimiento ya se ha añadido anteriormente a la lista',
    regOk: '{campo} registrada correctamente',
    rellenarCamposObligatorios: 'Rellene los campos obligatorios',
    responderMultiplesSolicitudes: 'Realizando respuesta múltiple a solicitudes...',
    responderMultiplesSolicitudesOk: 'Respuesta múltiple a solicitudes realizada correctamente',
    responderSolicitud: 'Realizando respuesta a {campo}...',
    responderSolicitudOk: 'Respuesta a {campo} realizada correctamente',
    send: 'Procesando {campo}...',
    setDelitoMateriaProcOrigenToActual:
        'Se ha establecido el delito/materia del procedimiento origen como delito/materia actual',
    setNigProcOrigenToActual: 'Se ha establecido el NIG del procedimiento origen como NIG actual',
    update: 'Actualizando {campo}...',
    updateOK: '{campo} actualizado correctamente',
    updateOKFem: '{campo} actualizada correctamente',
    updateRelacionOk: 'Relación actualizada correctamente',
};

export default notifyMessages;
