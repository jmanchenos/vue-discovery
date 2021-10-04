/* eslint-disable max-len */
const confirmMessages = {
  aceptarEscritosMasiva: `¿Desea dar de alta los {length} escritos de manera masiva?`,
  actualizarDatosProcedimiento: '¿Desea actualizar los datos del procedimiento?',
  acumulacionOk: 'Las cargas se han {tipoCarga} correctamente',
  anularProcedimientos: '¿Desea anular los procedimientos seleccionados?',
  cancel: '¿Realmente desea cancelar?',
  cerrarRegistro: '¿Desea cerrar el registro? No se guardarán todos los cambios',
  changeEscritoType:
    'Perderá la información con la referencia del código de barras del Acuse. ¿Desea continuar?',
  clasesRegistroRepartoNoRelacionadas:
    'No existe relación entre la clase de registro y la clase de reparto, ¿Desea continuar?',
  clasesRegistroRepartoNoRelacionadasRepartida:
    'No existe relación entre la clase de registro y la clase de reparto.',
  confirmAceptacionAsunto: 'Se va a aceptar el asunto {asunto}. ¿Desea continuar?',
  confirmAceptacionEscrito:
    'Se va a aceptar el escrito {escrito} asociado al procedimiento </br> {numProc}. ¿Desea continuar?',
  confirmAceptacionEscritosMasivo: '¿Aceptar los escritos seleccionados?',
  confirmActionDevolucion: '¿Desea realizar {accion} de la devolución con los datos introducidos?',
  confirmAcumulacion:
    '¿Está seguro de {tipoCarga} las cargas de la Clase de Reparto "{clasesReparto}" a la Clase "{clasesRepartoAct}"?',
  confirmAgendaPlazo:
    'Existe un acontecimiento con estado de cumplimentación <b>{estado}</b>.<br/> ¿Desea modificar dicho estado por <b>PENDIENTE RESPUESTA EN PLAZO</b>?',
  confirmAlerts: `¿Desea consultar sus alertas?`,
  confirmBatchTiposDocumentales: '¿Establecer todos los tipos documentales a <b>{campo}</b>?',
  confirmBorrarBarCode:
    'Perderá la información con la referencia del código de barras del acuse.<br>¿Desea continuar?',
  confirmBorrarRecurso:
    'Se han producido modificaciones,<br>¿Realmente desea eliminar la información especificada?',
  confirmContinuarAccion: 'Se perderán los cambios realizados. ¿Realmente desea {accion}?',
  confirmData: `¿Está conforme con los datos introducidos?`,
  confirmDevolucion: '¿Desea realizar la devolución con los datos introducidos?',
  confirmDevolucionAsuntoConMinutas:
    'Existen solicitudes de minuta pendientes. Al devolver el procedimiento las solicitudes de minuta serán canceladas. ¿Desea continuar?',
  confirmForbiddenRevision:
    'La Personación no está en situación de modificación ¿Desea consultarla?',
  confirmIncoacionAsunto: 'Se va a incoar el asunto {asunto}. ¿Desea continuar?',
  confirmMotivoCierreRecursoInterpuesto: '¿Realmente desea cerrar el recurso interpuesto?',
  confirmNewPersonacion: `La personación ha quedado registrada con los siguientes datos: `,
  confirmOrigen: `Datos de origen incompletos. ¿Desea continuar?`,
  confirmQuestionPersonacion: `<br> ¿Desea registrar una nueva Personación?`,
  confirmQuitarSecretoSumario:
    'Va a proceder a quitar el Secreto de Actuaciones y la información pasará a ser visible por todo el personal del Órgano. ¿Desea continuar?',
  confirmRegistrarAsunto: '¿Desea registrar definitivamente {articulo} {tipologia}?',
  confirmRegistrarSemejante:
    'No ha seleccionado ningún registro. Se registrará la persona recibida ¿Desea continuar?',
  confirmRegistrarTodosSemejantes:
    'No ha seleccionado ningún registro. Se registrarán todas las personas recibidas ¿Desea continuar?',
  confirmRegistrarTodosSemejantesMessage:
    'No ha seleccionado ningún registro. Se registrarán las {campo} personas recibidas ¿Desea continuar?',
  confirmUpdateDatesIntervinientePresoPreventivo: `El interviniente {nombreCompleto} tiene el siguiente apunte en la agenda de control de presos preventivos:</br>
    <b>F. Ingreso:</b> {fechaIngreso} <b>F. Vencimiento:</b> {fechaVencimiento} <b>F. Aviso:</b> {fechaAviso} ¿Desea modificarlo?`,
  conforme: '¿Está conforme con todos los datos del {campo}?',
  copiarAcontecimientos: '¿Realmente desea copiar los acontecimientos seleccionados?',
  delete: '¿Realmente desea eliminar el {campo} seleccionado? </br>La eliminación es irreversible',
  deleteAllDocumentos:
    '¿Realmente desea eliminar todos los documentos del escrito? </br>La eliminación es irreversible',
  deleteFem: '¿Desea eliminar la {campo} seleccionada?',
  deleteRelacionClaseRegistroReparto:
    'Ha borrado todas las clases de reparto, si acepta, la relación se eliminará. <br/> ¿Está seguro que desea eliminar la relación?',
  deleteValue: '¿Desea eliminar {articulo} {campo} {valor}?',
  desasociarPersonacion:
    'Se eliminarán las relaciones asociadas al procedimiento destino creadas a partir de esta personación. ¿Desea continuar?',
  deseaFinalizarRegistro:
    '¿Desea finalizar el registro?<br/>Todos los intervinientes y escritos deben estar registrados',
  deseaFinalizarRegistroAuxilioNoScace:
    '¿Desea finalizar el registro?<br/>Todos los escritos deben estar registrados',
  deseaIncoar: '¿Desea incoar el procedimiento?',
  deseaRegistrar: '¿Desea registrar {campo}?',
  devolverProcedimientoJuzgado: '¿Desea realizar la devolución del procedimiento seleccionado?',
  expRelacionadoConfirm: `El procedimiento {codeClass} {number} / {year} {piece} tiene asociado un Expediente Administrativo,<br/>
                          ¿Desea mantener dicha asociación?`,
  finalize: '¿Desea finalizar el {campo}?',
  inicializarCargasClaseReparto:
    '¿Está seguro de inicializar las cargas de la Clase de Reparto "{codigo}"?',
  mantenerCambiarEstado:
    'No ha seleccionado cambiar el estado a {estado}. ¿Desea mantener o cambiar el estado?',
  messageAsignacionClaseRepartoRegistro:
    'Se actualizará automáticamente la asignación de las clases de reparto de las clases de registro de los niveles superiores e inferiores',
  newEscritoConfirm: `El {campo} ha quedado registrado con los siguientes datos:<br/>
                      Nº General: <b>{numeroEscrito} / {anio}</b> <br/> ¿Desea registrar un nuevo {campo}?`,
  newIntervinienteConfirm:
    'El interviniente ha quedado registrado ¿Desea registrar un nuevo interviniente de tipo {tipoInterviniente}?',
  newProcedimientoAceptadoConfirm: `{campo}<br/>
                      {literalNumeroRegistro}: <b>{numeroReparto} / {anioReparto}</b><br/>
                      {literalNumeroEntrada}: <b>{numeroEntrada} / {anioEntrada}</b>`,
  newProcedimientoConfirm: `{campo}<br/><br/>
                      {literalNumero}: <b>{claseProcedimiento} {numeroReparto} / {anio}</b><br/>
                      {destino}<br/>
                      {ngeneral}<br/>
                      {nuevoCampo}`,
  ningunOrganoSeleccionado:
    'Si no se selecciona ningún Organo la asignación será extensiva a todos.¿Continuar?',
  preRegPersonacion: `Se va a dar de alta la personación ¿Está conforme con los datos?`,
  printMultipleFilterConfirm: `El número de resultados es muy alto, esta operación puede tardar varios minutos.<br/>
                              ¿Desea continuar?`,
  procedimientoNoEditable:
    'Este procedimiento no está en situación de modificación ¿Desea consultarlo?',
  procedimientoVivoACU: `El procedimiento destino se encuentra en estado de baja por:<br/> <b>{motivo}</b>.<br/>
                         El procedimiento al cual se ha acumulado es:<br/> <b>{descripcion}</b>.<br/><br/>
                         ¿Desea continuar?`,
  procedimientoVivoNoSeleccionable:
    'El procedimiento destino se encuentra en estado de baja por <br/><b>{descripcion}</b>.<br/>',
  procedimientoVivoOtros:
    'El procedimiento destino se encuentra en estado de baja por <br/><b>{descripcion}</b>.<br/>¿Desea continuar?',
  procedimientoVivoTRF: `El procedimiento destino se encuentra en estado de baja por:<br/> <b>{motivo}</b>.<br/>
                         El procedimiento al cual se ha transformado es:<br/> <b>{descripcion}</b>.<br/><br/>
                         ¿Desea continuar?`,
  registrarNuevoAsunto: '¿Desea registrar un nuevo asunto?',
  registroNig: `¿Desea introducir manualmente el NIG? <br>
    Si cancela se generará un NIG propio.<br>
    Si acepta deberá introducir manualmente el NIG de origen.`,
  registroOrigen: 'Se ha registrado un origen para el {campo}.<br>',
  registroOrigenFem: 'Se ha registrado un origen para la {campo}.<br>',
  repartidaAdicionales: 'La {campo} ha quedado registrada con los siguientes datos',
  repartidoAdicionales: 'El {campo} ha quedado registrado con los siguientes datos',
  salirSinAsignar: `¿Desea salir sin asignar {campo}?`,
  salirSinCopiarAcontecimientos: '¿Realmente desea salir sin copiar acontecimientos?',
  sendEnvio: 'Va a enviar {campo}. ¿Desea continuar?.',
};

export default confirmMessages;
