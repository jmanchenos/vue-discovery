/**
 * @namespace $file
 * @description Plugin para la gestion de archivos centralizada
 * @example
 *              this.$file.open(path);
 * @version 1.0.0
 */
import { API_METHODS, UPLOAD_URL } from '@/utils/constants';
import axios from '@/plugins/axios';

const { POST, GET } = API_METHODS;

const File = {};
const extensionesWE = ['RTF', 'DOC', 'DOCX'].map(item => `.${item}`);

// TODO
// Los mensages deberias salir del i18n pero todavia no he econtrado la forma de cargarlos en este punto
// ya que vueLocal.prototype.$t() explota
const messages = {
  soloApp: 'La funcionalidad solo está disponible en la aplicación de escritorio',
  noExiste: 'El archivo al que intenta acceder no existe',
  mindocuError:
    'Parece que no tiene acceso al Servidor de documentos o no está disponible.<br/> Por favor, contacte con el administrador',
  fileNotFound: 'No existe el fichero a descargar',
};

File.install = Vue => {
  const vueLocal = Vue;
  vueLocal.prototype.$file = {
    open: async path => {
      const { $electron, $Notification, $Loading } = vueLocal.prototype;
      if (!$electron) {
        $Notification.error(messages.soloApp);
        return;
      }
      try {
        $Loading.show();
        const { parse } = $electron.remote.require('path');
        const { existsSync } = $electron.remote.require('fs');
        const { ext, root } = parse(path);
        const isMindocu = root.toUpperCase().includes('X');

        if (isMindocu && !existsSync(root)) $Notification.error(messages.mindocuError);
        else if (!existsSync(path)) $Notification.error(messages.noExiste);
        else await $electron.ipcRenderer.invoke('abrir-archivo', { path });
        return;
      } catch (error) {
        $Notification.error(error);
        throw error;
      } finally {
        $Loading.hide();
      }
    },
    get: async (path, callback) => {
      const { $electron, $Notification, $Loading } = vueLocal.prototype;
      if (!$electron) {
        $Notification.error(messages.soloApp);
        return;
      }
      try {
        $Loading.show();
        const { parse } = $electron.remote.require('path');
        const { existsSync, readFile } = $electron.remote.require('fs');
        let result;
        if (existsSync(path)) result = await readFile(path, callback);
        return result;
      } catch (error) {
        $Notification.error(error);
        throw error;
      } finally {
        $Loading.hide();
      }
    },
    download: async (path, callback) => {
      let resultContent;
      const { $electron, $Notification, $EventBus } = vueLocal.prototype;
      if (!$electron) {
        $Notification.error(messages.soloApp);
        return;
      }
      try {
        const { parse } = $electron.remote.require('path');
        const { existsSync } = $electron.remote.require('fs');
        const { ext, root } = parse(path);
        const isMindocu = root.toUpperCase().includes('X');

        if (isMindocu && !existsSync(root)) {
          $Notification.error(messages.mindocuError);
          $EventBus.$emit('archivoDescargadoCancelado');
        } else if (!existsSync(path)) {
          $Notification.error(messages.noExiste);
          $EventBus.$emit('archivoDescargadoCancelado');
        } else {
          const dialog = $electron.remote.dialog;
          const separator = '\\';
          let nameFile = path.split(separator);
          dialog
            .showSaveDialog({
              title: 'Guardar archivo',
              defaultPath: nameFile[nameFile.length - 1],
            })
            .then(async file => {
              if (!file.canceled) {
                const data = {
                  dest: file?.filePath,
                  path: path,
                };
                await axios({
                  method: POST,
                  url: UPLOAD_URL,
                  data: data,
                  onDownloadProgress: progressEvent => {
                    let percentCompleted = Math.round(
                      (progressEvent.loaded / progressEvent.total) * 100
                    );
                    //cuando finalice de cargar el archivo devuelve true para finalizar el spinner de descarga del archivo
                    if (percentCompleted === 100) {
                      $EventBus.$emit('archivoDescargado');
                    } else {
                      $EventBus.$emit('porcentDownloadFile', percentCompleted);
                    }
                  },
                });
              } else {
                $EventBus.$emit('archivoDescargadoCancelado');
              }
            })
            .catch(err => {
              $Notification.error(err);
              throw err;
            });
        }
      } catch (error) {
        $Notification.error(error);
      }
    },
    getUrl: async (url, callback) => {
      const { $electron, $Notification, $APIService } = vueLocal.prototype;
      if (!$electron) {
        $Notification.error(messages.soloApp);
        return;
      }
      try {
        let response = await $APIService
          .raw({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            transformRequest: (data, headers) => {
              let h = headers;
              delete h.common['Authorization'];
            },
          })
          .catch(error => {
            // $Notification.error(messages.noExiste);
          });
        if (response?.data) callback(null, new Uint8Array(response.data));
        return;
      } catch (error) {
        $Notification.error(error);
        callback(error, null);
        throw error;
      }
    },
    openUrl: async ({ url, extension }) => {
      const { $electron, $Notification, $APIService, $EventBus } = vueLocal.prototype;
      let result = false;
      if (!$electron) {
        $Notification.error(messages.soloApp);
        $EventBus.$emit('archivoDescargadoCancelado');
        return result;
      }
      // controlador para cancelar la descarga en caso de error
      const controller = new AbortController();
      const { signal } = controller;
      let writer;
      try {
        const { carpetaTemporal } = await $electron.ipcRenderer.invoke('get-configuracion');
        const fs = $electron.remote.require('fs');
        const path = `${carpetaTemporal}${new Date().getTime()}${extension.toLowerCase()}`;
        console.log(path);
        writer = fs.createWriteStream(path, { flags: 'ax' });
        const response = await fetch(url, { signal });
        const contentLength = response.headers.get('content-length') || 0;
        const reader = response.body.getReader();
        let receivedLength = 0;
        let lastPercent = 0;
        try {
          if (response.ok) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                writer.end();
                break;
              }
              writer.write(value); // escribir en disco
              receivedLength += value.length;
              const percentCompleted = Math.floor((receivedLength / contentLength) * 100);
              if (lastPercent !== percentCompleted) {
                // evitar que salte el evento mas veces de las necesarias para mostrar el progreso
                lastPercent = percentCompleted;
                $EventBus.$emit('porcentDownloadFile', percentCompleted);
              }
            }
          } else {
            throw new Error(messages.fileNotFound);
          }
        } catch (e) {
          throw e;
        }
        //cuando finalice de cargar el archivo devuelve true para finalizar el spinner de descarga del archivo
        $EventBus.$emit('archivoDescargado', false);
        await $electron.ipcRenderer.invoke('abrir-archivo', { path });
        result = true;
        return result;
      } catch (error) {
        // cancelamos la request en caso de error
        controller.abort();
        // cerramos el stream para no dejar procesos muertos abiertos
        writer && writer.end();
        $EventBus.$emit('archivoDescargadoCancelado');
        throw error;
      }
    },
    downloadFromUrl: async ({ url, extension, requiereAutorizacion = false }, callback) => {
      let resultContent;
      const { $electron, $Notification, $EventBus, $APIService } = vueLocal.prototype;
      if (!$electron) {
        $Notification.error(messages.soloApp);
        $EventBus.$emit('archivoDescargadoCancelado');
        return;
      }
      try {
        const dialog = $electron.remote.dialog;
        const separator = '/';
        let pathArray = url.split('?')[0].split(separator);
        let nameFile = pathArray.pop();
        dialog
          .showSaveDialog({
            title: 'Guardar archivo',
            defaultPath: nameFile,
          })
          .then(async file => {
            if (file.canceled) {
              $EventBus.$emit('archivoDescargadoCancelado');
            } else {
              const response = await $APIService
                .raw({
                  method: 'get',
                  url: url,
                  responseType: 'arraybuffer',
                  transformRequest: (data, headers) => {
                    let h = headers;
                    if (!requiereAutorizacion) delete h.common['Authorization'];
                  },
                  onDownloadProgress: progressEvent => {
                    let percentCompleted = Math.round(
                      (progressEvent.loaded / progressEvent.total) * 100
                    );
                    //cuando finalice de cargar el archivo devuelve true para finalizar el spinner de descarga del archivo
                    if (percentCompleted === 100) {
                      $EventBus.$emit('archivoDescargado');
                    } else {
                      $EventBus.$emit('porcentDownloadFile', percentCompleted);
                    }
                  },
                })
                .catch(error => {
                  $Notification.error(`Download error: ${error}`);
                  $EventBus.$emit('archivoDescargadoCancelado');
                });
              if (response?.data) {
                const archivo = await $electron.ipcRenderer.invoke('crear-fichero', {
                  content: new Uint8Array(response.data),
                  path:
                    extension && !file.filePath.includes(extension)
                      ? file.filePath.concat(extension)
                      : file.filePath,
                });
              }
              return;
            }
          });
      } catch (error) {
        $Notification.error(error);
        $EventBus.$emit('archivoDescargadoCancelado');
      }
    },
  };
};

export default File;
