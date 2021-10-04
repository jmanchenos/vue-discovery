'use strict';
/* eslint-disable no-param-reassign */
import axios from 'axios';
import { logger } from '@/utils/logger';
import { API_METHODS } from '@/utils/constants';
import { addExceptionHandler, EXCEPTIONS } from '@/utils/exception';
import { uid as generateUid } from 'quasar';

const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = API_METHODS;

export const backoffTypes = {
  EXPONENTIAL: 'exponential',
  LINEAR: 'linear',
  STATIC: 'static',
};

export const UNEXPECTED_ERROR = {
  error: 'UNEXPECTED_ERROR',
  config: { retries: 0, noResponseRetries: 0 },
  handler: unexpectedErrors,
};

export const defaultStatusCodesToRetry = [
  { range: [100, 109], config: { retries: 0 }, handler: flowInformation },
  { range: [203], config: { retries: 0 }, handler: flowInformation },
  { range: [202, 208], config: { retries: 0 }, handler: flowInformation },
  { range: [300, 309], config: { retries: 0 }, handler: flowInformation },
  { range: [400, 400], config: { retries: 0 }, handler: controlledErrors },
  { range: [401, 401], config: { retries: 0 }, handler: controlledErrors },
  { range: [403, 403], config: { retries: 0 }, handler: accessErrors },
  { range: [404, 404], config: { retries: 0 }, handler: notFoundErrors },
  { range: [408, 408], config: {}, handler: timeOutErrors },
  { range: [418, 418], config: { retries: 0 }, handler: notFoundErrors },
  { range: [422, 422], config: { retries: 0 }, handler: infoErrors },
  { range: [423, 423], config: { retries: 0 }, handler: lockedErrors },
  { range: [428, 428], config: { retries: 0 }, handler: concurrenceErrors },
  { range: [400, 499], config: { retries: 0 }, handler: clientErrors },
  { range: [500, 500], config: { retries: 0 }, handler: notFoundErrors },
  { range: [501, 502], config: { retries: 0 }, handler: notFoundErrors },
  { range: [503, 504], config: {}, handler: notFoundErrors },
  { range: [505, 512], config: { retries: 0 }, handler: notFoundErrors },
  { range: [521, 521], config: { retries: 0 }, handler: notFoundErrors },
];

// Ejemplo de sobrescritura de configuración de la configuración por defecto en método/verbo
// export const GET_CONFIG = [
//   { range: [404, 404], config: { retries: 0 }, handler: notFoundErrors },
//   ...defaultStatusCodesToRetry,
// ];

export const defaultHttpMethodsToRetry = {
  //Ej:  [GET]: GET_CONFIG,
  [GET]: defaultStatusCodesToRetry,
  [POST]: defaultStatusCodesToRetry,
  [PUT]: defaultStatusCodesToRetry,
  [PATCH]: defaultStatusCodesToRetry,
  [DELETE]: defaultStatusCodesToRetry,
  [OPTIONS]: defaultStatusCodesToRetry,
};

export const defaultStatusCodesNoResponse = [
  { error: 'ECONNABORTED', config: {}, handler: noResponseErrors },
  { error: 'ERR_CONNECTION_REFUSED', config: {}, handler: noResponseErrors },
  { error: 'ENOTFOUND', config: {}, handler: noResponseErrors },
  { error: 'ETIMEDOUT', config: {}, handler: noResponseErrors },
];

/**
 * Reportar el error a Sentry.
 * @param error Error de axios con la configuración (retry)
 */
function report(error) {
  const message = [];
  const { response, request, config } = error;
  response && message.push(`[status=${response.status}]\n`);
  config && message.push(`[url=${config.url}]\n`);
  if (response?.data) {
    Object.entries(response.data).forEach(([key, value]) => {
      message.push(`${key}=${Array.isArray(value) ? value.join(', ') : value || ''}\n`);
    });
  }
  message.push(error.stack);
  let uid = `front-${generateUid()}`;
  if (config?.retry) {
    uid =
      config.retry.uid ||
      response?.data?.uid ||
      response?.headers?.traceid ||
      `front-${generateUid()}`;
    config.retry.uid = uid;
  }
  logger({
    message: message.join(' '),
    uid,
    source: response ? 'back' : 'front',
  });
}

/**
 * Función por defecto para errores controlados.
 * @param err Error de axios con la configuración (retry)
 */
export function defaultError(err) {
  report(err);
  addExceptionHandler(err);
}

/**
 * Función por defecto para errores controlados.
 * @param err Error de axios con la configuración (retry)
 */
export function controlledErrors(err) {
  report(err);
  addExceptionHandler(err, EXCEPTIONS.NOT_FOUND);
}

/**
 * Función por defecto para errores informativos.
 * @param err Error de axios con la configuración (retry)
 */
export function infoErrors(err) {
  report(err);
  addExceptionHandler(err, EXCEPTIONS.INFO_ERROR);
}

/**
 * Función por defecto para errores de bloqueo.
 * @param err Error de axios con la configuración (retry)
 */
export function lockedErrors(err) {
  report(err);
  addExceptionHandler(err, EXCEPTIONS.LOCKED_ERROR);
}

/**
 * Función por defecto para el flujo informativo.
 * @param err Error de axios con la configuración (retry)
 */
export function flowInformation(err) {
  report(err);
}

/**
 * Función por defecto para errores de cliente.
 * @param err Error de axios con la configuración (retry)
 */
export function clientErrors(err) {
  report(err);
}

/**
 * Función por defecto para time out de servidor.
 * @param err Error de axios con la configuración (retry)
 */
export function timeOutErrors(err) {
  report(err);
  addExceptionHandler(err, EXCEPTIONS.NOT_FOUND);
}

/**
 * Función por defecto para errores sin response.
 * @param err Error de axios con la configuración (retry)
 */
export function noResponseErrors(err) {
  report(err);
}

/**
 * Función por defecto para errores de concurrencia.
 * @param err Error de axios con la configuración (retry)
 */
export function concurrenceErrors(err) {
  report(err);
  if (err?.response?.data?.content) {
    err.message = err.response.data.content;
  }
  addExceptionHandler(err, EXCEPTIONS.INFO_ERROR);
}

/**
 * Función por defecto para errores del servidor.
 * @param err Error de axios con la configuración (retry)
 */
export function serverErrors(err) {
  report(err);
  addExceptionHandler(err, EXCEPTIONS.SERVER);
}

/**
 * Función por defecto para errores del servidor.
 * @param err Error de axios con la configuración (retry)
 */
export function notFoundErrors(err) {
  report(err);
  addExceptionHandler(err, EXCEPTIONS.NOT_FOUND);
}

/**
 * Función por defecto para errores del servidor.
 * @param err Error de axios con la configuración (retry)
 * @description Es utilizado para los errores con status 403 cuya estructura es distinta a los demás errores
 */
export function accessErrors(err) {
  report(err);
  if (err?.response?.data?.content) {
    err.message = err.response.data.content;
  }
  addExceptionHandler(err, EXCEPTIONS.INFO_ERROR);
}

export function unexpectedErrors(err) {
  report(err);
  addExceptionHandler(err);
}

function onSuccess(res) {
  // Comprobamos el status de la respuesta, ya que solicitan que se informe a sentry de las llamadas correctas y estas no pasan
  // por la gestión en onError, si no en onSuccess
  if (res?.status >= 202 && res?.status <= 208) {
    report(res);
  }
  return res;
}

function onError(err) {
  if (axios.default.isCancel(err)) {
    return Promise.reject(err);
  }

  // Error js
  if (!err.config) {
    defaultError(err);
    return Promise.reject(err);
  }

  // Se añade la configuración al error
  const config = (err.config.retry = { ...(getConfig(err) || getDefaultConfig()) });

  // Determina si debe volver a llamar
  if (!config.shouldRetry(err)) {
    return Promise.reject(err);
  }
  // Ajustamos el tiempo de espera entre llamadas
  const onBackoffPromise = new Promise(resolve => {
    // Calcula el tiempo de espera.
    // Formula: (2^c - 1 / 2) * 1000
    let delay;
    if (config.backoffType === 'linear') {
      delay = config.currentRetryAttempt * 1000;
    } else if (config.backoffType === 'static') {
      delay = config.delay;
    } else {
      delay = ((Math.pow(2, config.currentRetryAttempt) - 1) / 2) * 1000;
    }
    // Incremento del número de llamadas realizadas para la misma request.
    err.config.retry.currentRetryAttempt += 1;
    setTimeout(resolve, delay);
  });
  // Ejecuta hook `onRetry` si se ha definido
  const onRetryPromise = config.onRetry ? Promise.resolve(config.onRetry(err)) : Promise.resolve();
  // Vuelve a ejecutar request

  return Promise.resolve()
    .then(() => onBackoffPromise)
    .then(() => onRetryPromise)
    .then(() => config.instance.request(err.config));
}
/**
 * Determina basándose en la configuración si se debe volver a llamar
 * @param err El error de axios que se pasa al interceptor.
 */
function shouldRetryRequest(err) {
  const config = err?.config?.retry;
  const retryAgain = (() => {
    // Si no tiene configuración o el número de rellamadas es 0
    if (!config || config?.retries === 0) {
      return false;
    }
    // Si tiene configuración, añadimos el número de rellamada actual.
    config.currentRetryAttempt = config.currentRetryAttempt || 0;

    // Comprobamos si el método y el status tiene unos parámetros asociados
    // Si no lo tenemos controlado
    let allowedByStatus = findByStatusCode(err);
    if (!allowedByStatus) {
      defaultError(err);
      return false;
    }

    // añadimos su configuración y ejecutamos su handler
    // si no, añadimos ejecutamos el handler por defecto
    Object.assign(config, allowedByStatus.config || {});
    if (allowedByStatus.handler) {
      allowedByStatus.handler(err);
    } else {
      defaultError(err);
    }

    // Si es un error sin response, comprobamos el número de rellamadas.
    if (!err.response && config.currentRetryAttempt >= config.noResponseRetries) {
      return false;
    }

    // Si el número de rellamada actual es mayor al de la configuración
    if (err.response && config.currentRetryAttempt >= config.retries) {
      return false;
    }

    return true;
  })();
  // Hook para ejecutar después de la última rellamada
  if (!retryAgain && config.onLeave) config.onLeave(err);
  return retryAgain;
}
/**
 * Retorna el elemento asociado al status
 * @param err Error de axios con la configuración (retry)
 */
function findByStatusCode(err) {
  const { methodsToRetry, statusCodesNoResponse, additionalStatus } = err.config.retry;
  const statusCodesToRetry = methodsToRetry[err.config.method];
  const status = err.response?.status;
  const additionalStatusCodes = Array.isArray(additionalStatus) ? additionalStatus : [];
  const { statusCodes, codesNoResponse } = additionalStatusCodes.reduce(
    (acc, el) => {
      if (el.error) acc.codesNoResponse.push(el);
      if (el.range) acc.statusCodes.push(el);
      return acc;
    },
    {
      statusCodes: [],
      codesNoResponse: [],
    }
  );
  let found = false;
  if (status) {
    found = statusCodes
      .concat(statusCodesToRetry)
      .find(({ range: [min, max] } = e) => status >= min && status <= max);
  } else {
    found = codesNoResponse
      .concat(statusCodesNoResponse)
      .find(statusCode => statusCode.error === err.code);
  }
  return found ?? UNEXPECTED_ERROR;
}
/**
 * Retorna la configuración si está disponible en el error de axios.
 * @param err Error de axios con la configuración (retry)
 */
function getConfig(err) {
  if (err && err.config) {
    return err.config.retry;
  }
  return;
}

function getDefaultConfig(instance, config = {}) {
  return {
    instance: instance || axios.default,
    // Número de rellamadas
    retries: 3,

    // Número de rellamadas si no se obtiene respuesta (ENOTFOUND, ETIMEDOUT, etc).
    noResponseRetries: 2,

    // Milisegundos para el tipo backoff 'static'.
    delay: 100,

    // Un array de objetos cuya propiedad son los métodos HTTP que serán rellamados.
    // Ej: 'get': [{range: [400, 499], config: {retries: 2}, handler: (err) => {}}]
    methodsToRetry: defaultHttpMethodsToRetry,

    // Un array que añade configuración al método/verbo de una llamada concreta.
    // Ej: additionalStatus: [
    //   { range: [408, 428], handler: (err) => {} },
    //   { error: 'ECONNABORTED', handler: (err) => {} },
    // ],
    additionalStatus: [],

    //Los errores de las request que no obtienen respuesta.
    statusCodesNoResponse: defaultStatusCodesNoResponse,

    // Tipo de retardo.
    // Tipos: 'exponential' (defecto), 'static' or 'linear'
    backoffType: backoffTypes.EXPONENTIAL,

    // Hook para decidir si se debe ejecutar la rellamada o no.
    // Debe retornar un booleano.
    shouldRetry: shouldRetryRequest,

    // Hook que ejecuta una función cuando se realiza la rellamada,
    // Puede ser una promesa.
    // Si es una promesa se ejecutará en serie y parará el flujo hasta ser resuelta.
    onRetry: async err => {
      return await Promise.resolve(err);
    },

    // Hook que se ejecuta después de la última rellamada, antes de hacer el reject.
    onLeave: err => err,
    ...config,
  };
}

export default function(instance, config = {}) {
  instance = instance || axios.default;
  const configuration = getDefaultConfig(instance, config);
  instance.defaults.retry = config;
  const interceptorId = instance.interceptors.response.use(onSuccess, onError);
  return {
    config: configuration,
    interceptorId,
    destroy: () => instance.interceptors.response.eject(interceptorId),
  };
}
