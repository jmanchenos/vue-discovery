const errorMessages = {
    anioInicialMayorFinal: 'El año "desde" debe ser anterior al año "hasta"',
    anioMayorActual: 'El año no puede ser mayor al año actual',
    branchObligatoria: 'Es necesario seleccionar una rama',
    clasesRegistroTipologiaNotFound: 'No existen clases de registro para la tipología seleccionada.',
    descompresionCanceladaUsuario: 'Descompresión cancelada por el usuario',
    descripcionObligatoria: 'La descripción es obligatoria',
    descripcionSuperiorMaxCaracteres: 'La descripción no puede tener mas de 100 caracteres',
    documentosContenidoObligatorios: 'Debe introducir documentos asociados o contenido',
    error: 'Ocurrio un error',
    errorArchivoNoExiste: 'El archivo al que intenta acceder no existe',
    errorBranchRemoto: 'Error obteniendo las ramas de remoto',
    errorClasesRepartoIguales: 'Las clases de reparto no pueden ser iguales',
    errorCopiaFicheroDDD: 'No se ha podido transferir el documento de la Diligencia de Devolución',
    errorCopiaFicheroDDR: 'No se ha podido transferir el documento de la Diligencia de Reparto',
    errorDateRange: 'Se debe rellenar el rango de fechas',
    errorDatosNoValidos: 'No son datos válidos',
    errorDesconocidoNig: 'Ha ocurrido un error desconocido cargando el NIG',
    errorEmail: 'El email especificado no es válido',
    errorFechaPresentacionMenorFechaEntrega: 'Fecha de presentación debe ser mayor o igual que la fecha de entrega',
    errorFechaEntregaMayorFechaPresentacion: 'Fecha de entrega debe ser menor o igual que la fecha de presentación',
    errorInesperado: 'Ha ocurrido un error inesperado',
    errorLoadClasesProcedimiento: 'No se han podido cargar las clases de procedimiento',
    errorLoadDataStore: 'Error al recuperar datos del Store de procedimiento',
    errorLoadDataStoreInfraestructuras: 'Error al recuperar datos del Store de Infraestructuras',
    errorLoadDataStoreTareasPendientes: 'Error al recuperar datos del Store de tareas pendientes',
    errorLoadEstados: 'No se ha podido cargar el combo estados',
    errorOpenDoc: 'No fue posible leer el documento',
    errorOperacion: 'Se ha producido un error realizando la operación: {error}',
    errorPrintPDF: 'No se ha podido generar el pdf. Introduzca más filtros y/o inténtelo de nuevo',
    errorRegistro: 'Ha ocurrido un error durante el proceso de registro',
    errorReparto: 'No se ha podido ejecutar el reparto por falta de autorización',
    errorRepLegalEsElInterviniente:
        'Los datos del representante legal coinciden con los del interviniente. Modifique la selección',
    errorServer: 'Servidor temporalmente no disponible.',
    errorTelefono: 'El teléfono especificado no es válido',
    extensioNoPermitida: 'La extensión {extension} no está permitida',
    maxAmountExceeded:
        'Formato de importe incorrecto: La suma de los importes introducidos excede el tamaño permitido.',
    minDocuError:
        'Parece que no tiene acceso al Servidor de documentos o no está disponible.<br/> Por favor, contacte con el administrador',
    minUnCampoRequeridoBusqueda: 'Debe de completar al menos un campo para realizar la búsqueda',
    minUnCampoRequeridoBusquedaOjetos: 'Debe completar un mínimo de campos para realizar la búsqueda',
    nodesNotFound: 'No se ha encontrado ningún nodo',
    numeroCopiasObligatorio: 'El Número de copias es obligatorio',
    organoNoDesvinculado: 'El órgano no esta desvinculado',
    ordenOrganoNoCorresponde: 'El orden del órgano de asignación no se corresponde con el del contexto actual',
    procedimientoNotFound: 'No se ha podido localizar el procedimiento introducido',
    revisarErroresDocumentos: 'Revise los errores en los documentos',
    tipoDocumentalObligatorio: 'El tipo documental es obligatorio',
};

export default errorMessages;
