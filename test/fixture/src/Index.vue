<template>
  <div v-if="loaded" ref="container" class="container">
    <sg-form ref="formSolicitud">
      <sg-card>
        <template v-slot:body>
          <div class="row q-col-gutter-sm">
            <div class="col-3">
              <sg-input
                v-if="showProcedimiento"
                ref="procedimiento"
                :value="form.procedimiento"
                :label="i18n.procedimiento"
                disable
              />
              <sg-input
                v-else
                ref="escrito"
                :value="form.escrito"
                :label="i18n.nuEscrito"
                disable
              />
            </div>
            <div class="col-4">
              <sg-input ref="autor" :value="form.autor" :label="labelAutor" disable />
            </div>
            <div v-if="hayReferencia" class="col">
              <sg-input
                ref="referencia"
                :value="form.referencia"
                :label="labelReferencia"
                disable
              />
            </div>
            <template v-else-if="isMultiple">
              <div class="col-3"></div>
              <div class="col-2">
                <sg-select
                  ref="estado"
                  :label="i18n.estado"
                  v-model="form.coEstado"
                  :options="estados"
                  :required="!disable"
                  :clearable="false"
                  optionKey="coValor"
                  optionLabel="deValor"
                  :disable="disable"
                />
              </div>
            </template>
          </div>
          <template v-if="!isMultiple">
            <div class="row q-col-gutter-sm">
              <div class="vertical-middle col-3">
                <sg-option-group
                  ref="tipoDestinatario"
                  v-model="form.tipoDestinatario"
                  :inline="true"
                  :options="optionsTipoDestinatario"
                  :disable="disableTexto"
                  @input="cleanDestinatario"
                />
              </div>
              <div class="col-6 destinatario">
                <sg-inputs-dialog-selector
                  ref="destinatario"
                  :show-first-input="true"
                  :label2="i18n.destinatario"
                  :title="i18n.seleccionDestinatarioTitle"
                  :input1="form.coJuez"
                  :input2="form.nombreDestinatario"
                  :disable="disableTexto"
                  :required="!disableTexto"
                  @update:input1="handleInputDestinatario"
                  @accepted-dialog="destinatarioAceptedDialog"
                  @cancelled-dialog="destinatarioCanceledDialog"
                  @show-dialog="showInputDialogSelector"
                  @hide-dialog="$Helpers.initShortkey(configShortkey)"
                >
                  <template slot="body">
                    <sg-table
                      row-key="coJuez"
                      selected-row="single"
                      :data="optionsDestinatario"
                      :wrap-cells="true"
                      :columns="columnsDestinatarios"
                      :show-index="false"
                      :rows-per-page="10"
                      :rows-selected.sync="selectedIndex"
                    />
                  </template>
                </sg-inputs-dialog-selector>
              </div>
              <div class="vertical-middle q-pl-md">
                <sg-checkbox
                  ref="checkUrgente"
                  :label="i18n.urgente"
                  v-model="form.flgUrgente"
                  :disable="isDisableUrgente"
                />
              </div>
              <div v-if="showEstado" class="col">
                <sg-select
                  ref="estado"
                  :label="i18n.estado"
                  v-model="form.coEstado"
                  :options="estados"
                  :required="!disable"
                  :clearable="false"
                  optionKey="coValor"
                  optionLabel="deValor"
                  :disable="disable"
                />
              </div>
            </div>
            <div class="row q-col-gutter-md q-my-sm">
              <span class="text-bold col" v-text="labelTextoOrigen" />
              <div v-if="showAnexos" class="row col-6">
                <span class="text-bold col-11" v-text="labelAnexosOrigen" />
                <sg-badge
                  v-if="form.anexos.length"
                  color="secondary"
                  :floating="false"
                  :label="form.anexos.length"
                />
              </div>
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col">
                <sg-text-area
                  ref="texto"
                  v-model="form.texto"
                  label=""
                  :rules="textoRequired"
                  :min-rows="10"
                  maxlength="2000"
                  :disable="disableTexto"
                />
              </div>
              <div v-if="showAnexos" class="col-6 q-mt-xs">
                <div :class="['row', 'bg-white', 'tableList', fullHeightClass]">
                  <sg-table
                    ref="tablaAnexos"
                    virtual-scroll
                    row-key="uuid"
                    selected-row="none"
                    :table-height="tablaAnexosHeight"
                    :data="form.anexos"
                    :columns="tableConfig.columns"
                    :data-key="dataKey"
                    :wrap-cells="true"
                    :actions-icons="tableConfig.icons"
                    @viewAnexo="viewDocumento"
                    @deleteAnexo="deleteAnexo"
                    @row-click="setDescEditable(form.anexos, true, $event)"
                    :disable="disableTexto"
                    hide-header
                    :show-pagination="false"
                    separator="none"
                  >
                    <template v-slot:body-cell-descripcion="props">
                      <div class="full-width" v-if="props.row.descEditable && !disableTexto">
                        <sg-input
                          :ref="`AnexoInput${props.row.__index}`"
                          hide-bottom-space
                          :value="props.row.descripcion"
                          maxlength="300"
                          @input="actualizarDescripcionAnexo(form.anexos, props, $event)"
                          @blur="setDescEditable(form.anexos, false, props)"
                          @hook:mounted="loadInputAnexo(props)"
                          :disable="disable"
                        />
                      </div>
                      <div class="text-left ellipsis" v-else>
                        <span v-text="getValueWithEllipsis(props.row.descripcion, 60)"></span>
                        <sg-tooltip
                          v-if="props.row.descripcion.length > 60"
                          anchor="top middle"
                          type="default"
                          :offset="[0, 20]"
                          ><span v-text="props.row.descripcion"></span>
                        </sg-tooltip>
                      </div>
                    </template>
                  </sg-table>
                </div>
                <portal-target name="accionesAnexos" />
              </div>
            </div>
          </template>
          <template v-if="showRespuesta">
            <div class="row q-col-gutter-md q-my-sm">
              <span
                class="text-bold col"
                v-text="`${i18n.texto} ${!disableRespuesta ? '*' : ''}`"
              />
              <div v-if="showAnexos" class="row col-6">
                <span class="text-bold col-11" v-text="i18n.anexos" />
                <sg-badge
                  v-if="form.anexosRespuesta.length"
                  color="secondary"
                  :floating="false"
                  :label="form.anexosRespuesta.length"
                />
              </div>
            </div>
            <div class="row q-col-gutter-sm">
              <div class="col">
                <sg-text-area
                  ref="texto"
                  v-model="form.respuesta"
                  label=""
                  :rules="respuestaRequired"
                  :min-rows="10"
                  maxlength="2000"
                  :disable="disableRespuesta"
                />
              </div>
              <div v-if="showAnexos" class="col-6 q-mt-xs">
                <div :class="['row', 'bg-white', 'tableList', fullHeightClassRespuesta]">
                  <sg-table
                    ref="tablaAnexosRespuesta"
                    virtual-scroll
                    row-key="uuid"
                    selected-row="none"
                    :table-height="tablaAnexosRespuestaHeight"
                    :data="form.anexosRespuesta"
                    :columns="tableConfig.columns"
                    :data-key="dataKey"
                    :wrap-cells="true"
                    :actions-icons="tableConfig.iconsRespuesta"
                    @viewAnexo="viewDocumento"
                    @deleteAnexo="deleteAnexo"
                    @row-click="setDescEditable(form.anexosRespuesta, true, $event)"
                    :disable="disableRespuesta"
                    hide-header
                    :show-pagination="false"
                    separator="none"
                  >
                    <template v-slot:body-cell-descripcion="props">
                      <div class="full-width" v-if="props.row.descEditable && !disableRespuesta">
                        <sg-input
                          :ref="`AnexoInput${props.row.__index}`"
                          hide-bottom-space
                          :value="props.row.descripcion"
                          maxlength="300"
                          @input="actualizarDescripcionAnexo(form.anexosRespuesta, props, $event)"
                          @blur="setDescEditable(form.anexosRespuesta, false, props)"
                          @hook:mounted="loadInputAnexo(props)"
                          :disable="disable"
                        />
                      </div>
                      <div class="text-left ellipsis" v-else>
                        <span v-text="getValueWithEllipsis(props.row.descripcion, 60)"></span>
                        <sg-tooltip
                          v-if="props.row.descripcion.length > 60"
                          anchor="top middle"
                          type="default"
                          :offset="[0, 20]"
                          ><span v-text="props.row.descripcion"></span>
                        </sg-tooltip>
                      </div>
                    </template>
                  </sg-table>
                </div>
                <portal-target name="accionesAnexosRespuesta" />
              </div>
            </div>
          </template>
          <template v-if="isMultiple">
            <div class="row q-col-gutter-md q-my-sm">
              <span class="text-bold col" v-text="i18n.solicitudes" />
            </div>
            <div class="row q-my-sm">
              <sg-table
                ref="TABLA_LISTADO_SOLICITUDES"
                virtual-scroll
                row-key="id"
                selected-row="none"
                table-height="340px"
                :data="listadoSolicitudes"
                :data-key="dataKey"
                :columns="tablaSolicitudes.columns"
                :wrap-cells="true"
                disabled
              >
                <!--  texto -->
                <template v-slot:body-cell-texto="props">
                  <div class="row">
                    <span v-html="getTextoHtml(props.row)" />
                    <sg-tooltip
                      v-if="getTooltipTextoHtml(props.row)"
                      type="default"
                      anchor="top left"
                    >
                      <span v-html="getTooltipTextoHtml(props.row)" />
                    </sg-tooltip>
                  </div>
                </template>
              </sg-table>
            </div>
          </template>
        </template>
      </sg-card>
    </sg-form>
    <!-- Botonera -->
    <portal to="footer-destination-buttons" v-if="renderPortal">
      <div class="container">
        <div class="row">
          <div class="col-12 text-right">
            <sg-button
              ref="btnAccept"
              :label="i18n.aceptar"
              color="positive"
              icon="icon-check"
              class="q-ml-sm"
              v-if="!disable"
              :index-underlined="0"
              @click="confirmAceptar"
            />
            <sg-button
              ref="btnCancel"
              :color="colorCancel"
              :icon="iconoCancel"
              :label="labelCancel"
              class="q-ml-sm"
              :index-underlined="0"
              @click="goBack"
            />
          </div>
        </div>
      </div>
    </portal>
    <sg-confirm
      ref="confirmAceptar"
      :config="configConfirm"
      @accept="aceptar"
      @show-confirm="showConfirm"
      @hide-confirm="hideConfirm"
    />
    <sg-confirm ref="confirmEstado" :config="configConfirmEstado">
      <template #actions>
        <sg-button
          ref="mantener"
          color="light-blue-6"
          :flat="true"
          :auto-text-transform="false"
          :index-underlined="0"
          v-close-popup
          :label="labelMantener"
          @click="mantenerEstado"
        />
        <sg-button
          ref="cambiar"
          color="light-blue-6"
          :flat="true"
          :auto-text-transform="false"
          :index-underlined="6"
          v-close-popup
          :label="labelCambiar"
          @click="cambiarEstado"
        />
        <sg-button
          ref="cancelar"
          color="light-blue-6"
          :flat="true"
          :auto-text-transform="false"
          :index-underlined="0"
          v-close-popup
          :label="i18n.cancel"
          @click="closeConfirmEstado"
        />
      </template>
    </sg-confirm>
    <!-- Botonera de Anexos y Anexos respuesta-->
    <portal :to="portalTarget">
      <div class="row text-left bg-white tableButtons">
        <div class="col q-ml-sm q-my-xs">
          <sg-button
            ref="btnExpAdminAco"
            color="primary"
            icon="icon-carpeta"
            class="q-ml-sm"
            :label="i18n.bloqueDocumental"
            full-width
            @click="gotoExpAdministrativos"
          />
        </div>
        <div v-if="$electron" class="col q-ml-sm q-my-xs">
          <file-picker-button
            ref="btnDocumentos"
            icon="icon-documentos"
            :label="i18n.documentos"
            iclass="q-ml-sm"
            :accept="extDocumentosAdjuntar"
            @change="gotoDocumentos"
          />
        </div>
        <div class="col" />
      </div>
    </portal>
  </div>
</template>
<script lang="js">
import mixinsPanelAlerts from './mixins/mixin';

const GALATEA = 'http://localhost:5001/galatea/';
const WS_URL = new URL('api/v1/pdf/convert-to-pdf', GALATEA).href;
const [TIPO_DACION, TIPO_RESOLPTE] = ['D', 'R'];
const [TIPO_REF_PROCEDIMIENTO, TIPO_REF_ACONTECIMIENTO] = ['P', 'A'];
const [MODO_RESPUESTA, MODO_DETALLE, MODO_EDICION, MODO_ALTA] = ['MR', 'MD', 'ME', 'MA'];
//TODO a sustituir en un futuro para que lo devuelva el back con un flag

// Unión y normalizacion de rutas de ficheros
const pathJoin = (parts = []) => parts.join('/').replace(new RegExp(/(\/|\\){1,}/, 'g'), '/');

export default {
  name: 'view-formulario-solicitud',
  props: {
    url: {
      type: String,
      required: true,
    },
    disable: {
      type: Boolean,
      default: false,
    },
    storeModule: {
      type: String,
      required: true,
    },
    isRespuesta: {
      type: Boolean,
      default: false,
    },
    listadoSolicitudes: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    const i18n = {
      aceptar: this.$t('generic.accept'),
      actionConfirm: this.$t('confirmMessages.confirmData'),
      altaSolicitud: campo =>
        this.$t('notifyMessages.create', {
          campo,
        }),
      altaSolicitudOK: campo =>
        this.$t('notifyMessages.createOKFem', {
          campo,
        }),
      anexos: this.$t('formularioMinutas.anexos'),
      anexosOrigen: this.$t('formularioMinutas.anexosOrigen'),
      autor: this.$t('generic.autor'),
      bloqueDocumental: this.$t('formularioMinutas.bloqueDocumental'),
      borrar: this.$t('generic.borrar'),
      cambiarA: item => this.$t('generic.cambiarAItem', { item }),
      campoRequerido: this.$t('formularioMinutas.campoRequerido'),
      cancel: this.$t('generic.cancel'),
      coCuenta: this.$t('formularioMinutas.coCuenta'),
      coJuez: this.$t('formularioMinutas.coJuez'),
      destinatario: this.$t('generic.destinatario'),
      dni: this.$t('formularioMinutas.dni'),
      documentos: this.$t('generic.documentos'),
      editSolicitud: campo => this.$t('notifyMessages.update', { campo }),
      editSolicitudOK: campo => this.$t('notifyMessages.updateOKFem', { campo }),
      errorCopiaFichero: nombre => this.$t('formularioMinutas.errorCopiaFichero', { nombre }),
      estado: this.$t('generic.estado'),
      extensioNoPermitida: extension => this.$t('errorMessages.extensioNoPermitida', { extension }),
      fechaCreacion: this.$t('tableColumns.fechaCreacionAbrev'),
      load: campo => this.$t('notifyMessages.load', { campo }),
      mantenerCambiarEstado: estado => this.$t('confirmMessages.mantenerCambiarEstado', { estado }),
      mantener: item => this.$t('generic.mantenerItem', { item }),
      minDocuError: this.$t('errorMessages.minDocuError'),
      nombre: this.$t('generic.nombre'),
      nuEscrito: this.$t('generic.nuEscrito'),
      origen: this.$t('generic.origen'),
      procedimiento: this.$t('generic.procedimiento'),
      realizadaSobre: this.$t('tableColumns.realizadaSobre'),
      refDacion: this.$t('formularioMinutas.refDacion'),
      refResolucion: this.$t('formularioMinutas.refResolucion'),
      responderMultiplesSolicitudes: this.$t('notifyMessages.responderMultiplesSolicitudes'),
      responderMultiplesSolicitudesOk: this.$t('notifyMessages.responderMultiplesSolicitudesOk'),
      responderSolicitud: campo => this.$t('notifyMessages.responderSolicitud', { campo }),
      responderSolicitudOK: campo => this.$t('notifyMessages.responderSolicitudOk', { campo }),
      seleccionDestinatarioTitle: this.$t('formularioMinutas.seleccionDestinatarioTitle'),
      solicitudes: this.$t('formularioMinutas.enRespuestaA'),
      soloElectron: campo => this.$t('generic.soloElectron', { campo }),
      texto: this.$t('generic.texto'),
      textoOrigen: this.$t('generic.textoOrigen'),
      tipoDeSolicitud: this.$t('tableColumns.tipoDeSolicitud'),
      titleMA: tipoSolicitud => this.$t('viewsTitles.altaSolicitud', { tipoSolicitud }),
      titleMD: tipoSolicitud => this.$t('viewsTitles.detalleSolicitud', { tipoSolicitud }),
      titleME: tipoSolicitud => this.$t('viewsTitles.editSolicitud', { tipoSolicitud }),
      titleMR: tipoSolicitud =>
        this.isMultiple
          ? this.$t('viewsTitles.respuestaMultipleSolicitudes')
          : this.$t('viewsTitles.respuestaSolicitud', {
              tipoSolicitud,
            }),
      urgente: this.$t('generic.urgente'),
      verDetalle: this.$t('generic.view'),
      volver: this.$t('generic.volver'),
    };
    return {
      i18n,
      inputFile: null,
      outputFile: null,
      loaded: false,
      title: null,
      form: {},
      links: {},
      hints: {},
      renderPortal: false,
      selectedIndex: [],
      configConfirm: {
        dialog: false,
        message: i18n.actionConfirm,
      },
      configConfirmEstado: {
        dialog: false,
        message: '',
      },
      selects: {},
      columnsDestinatarios: [
        {
          name: 'coJuez',
          label: i18n.coJuez,
          field: row => row.coJuez,
          sortable: false,
          width: '20%',
          align: 'left',
        },
        {
          name: 'nombreDestinatario',
          label: i18n.nombre,
          field: row => row.nombreDestinatario,
          sortable: false,
          align: 'left',
        },
      ],

      configShortkey: [
        {
          key: {
            altKey: true,
          },
          callback: this.key_A_Callback,
        },
        {
          key: {
            altKey: true,
          },
          callback: this.cancelCallback,
        },
        {
          key: {
            onlyKey: true,
          },
          callback: this.cancelCallback,
        },
      ],
      configShortkeyEstado: [
        {
          key: {
            altKey: true,
          },
          callback: this.key_M_Callback,
        },
        {
          key: {
            altKey: true,
          },
          callback: this.key_R_Callback,
        },
        {
          key: {
            altKey: true,
          },
          callback: this.closeConfirmEstadoCallback,
        },
        {
          key: {
            onlyKey: true,
          },
          callback: this.closeConfirmEstadoCallback,
        },
      ],
      dataKey: 'internalData',
      tableConfig: {
        columns: [
          {
            name: 'descripcion',
            label: '',
            // tooltip: row => getTooltip(row.descripcion, 60),
            // field: row => getValueWithEllipsis(row.descripcion, 60),
            sortable: false,
            align: 'left',
            width: '80%',
          },
          {
            name: 'actions',
            width: '20%',
          },
        ],
        icons: [
          {
            icon: 'icon-ver',
            eventName: 'viewAnexo',
            tooltip: i18n.verDetalle,
            color: '#003154',
            conditionColor: () => '',
            show: () => true,
          },
          {
            icon: 'icon-borrar',
            eventName: 'deleteAnexo',
            tooltip: i18n.borrar,
            color: '#003154',
            conditionColor: () => '',
            show: () => !this.disableTexto,
          },
        ],
        iconsRespuesta: [
          {
            icon: 'icon-ver',
            eventName: 'viewAnexo',
            tooltip: i18n.verDetalle,
            color: '#003154',
            conditionColor: () => '',
            show: () => true,
          },
          {
            icon: 'icon-borrar',
            eventName: 'deleteAnexo',
            tooltip: i18n.borrar,
            color: '#003154',
            conditionColor: () => '',
            show: () => !this.disableRespuesta,
          },
        ],
      },
      tablaSolicitudes: {
        columns: [
          {
            name: 'tipoSolicitud',
            label: i18n.tipoDeSolicitud,
            field: row => row.deTipoSolicitud,
            sortable: false,
            width: '10%',
            align: 'left',
          },
          {
            name: 'urgente',
            label: '',
            sortable: false,
            width: '5%',
            align: 'left',
          },
          {
            name: 'feCreacion',
            label: i18n.fechaCreacion,
            field: row => row.feCreacion,
            sortable: false,
            width: '10%',
            align: 'left',
          },
          {
            name: 'referencia',
            label: i18n.realizadaSobre,
            field: row => row.referencia,
            tooltip: row => this.getTooltipReferencia(row),
            sortable: false,
            width: '15%',
            align: 'left',
          },
          {
            name: 'texto',
            label: i18n.texto,
            sortable: false,
            width: '60%',
            align: 'left',
          },
        ],
      },
      connected: false,
      socket: null,
      stompClient: null,
    };
  },
  computed: {
    extDocumentosAdjuntar() {
      let extensiones = '';
      this.selects.extensionesConvertirPdf.forEach(e => {
        extensiones = extensiones.length
          ? `${extensiones}, .${e.coValor.toLowerCase()}`
          : `.${e.coValor.toLowerCase()}`;
      });
      return extensiones;
    },
    /** @returns {boolean} */
    isMultiple() {
      return this.listadoSolicitudes.length > 1;
    },
    /** @returns {boolean} */
    isDisableUrgente() {
      return this.disable || this.isRespuesta;
    },
    /** @returns {boolean} */
    disableTexto() {
      return this.disable || this.isRespuesta;
    },
    /** @returns {boolean} */
    disableRespuesta() {
      return this.disable || !this.isRespuesta;
    },
    /** @returns {boolean} */
    existeSolicitud() {
      return !!this.form?.idSecuencial;
    },
    /** @returns {boolean} */
    showProcedimiento() {
      return Boolean(
        this.isMultiple || [TIPO_DACION, TIPO_RESOLPTE].includes(this.form?.tipoSolicitud)
      );
    },
    /** @returns {boolean} */
    showAnexos() {
      return [TIPO_DACION, TIPO_RESOLPTE].includes(this.form?.tipoSolicitud);
    },
    /** @returns {boolean} */
    showRespuesta() {
      return [MODO_DETALLE, MODO_RESPUESTA].includes(''); // posiblemente haya que hacerlo por estado
    },
    /** @returns {boolean} */
    hayReferencia() {
      return [TIPO_RESOLPTE, TIPO_DACION].includes(this.form?.tipoSolicitud);
    },
    /** @return {String} */
    modoVentana() {
      let valor;
      if (this.isRespuesta) valor = MODO_RESPUESTA;
      else if (this.disable) valor = MODO_DETALLE;
      else if (this.existeSolicitud) valor = MODO_EDICION;
      else valor = MODO_ALTA;
      return valor;
    },
    /** @returns {String} */
    labelTextoOrigen() {
      return this.disableTexto ? this.i18n.textoOrigen : `${this.i18n.texto} *`;
    },
    /** @returns {String} */
    labelAnexosOrigen() {
      return this.disableTexto ? this.i18n.anexosOrigen : this.i18n.anexos;
    },
    /** @returns {String} */
    labelAutor() {
      return this.isRespuesta && !this.isMultiple ? this.i18n.origen : this.i18n.autor;
    },
    /** @returns {String} */
    labelReferencia() {
      return this.form?.tipoSolicitud === TIPO_DACION
        ? this.i18n.refDacion
        : this.i18n.refResolucion;
    },
    /** @returns {String} */
    labelCancel() {
      return this.disable ? this.i18n.volver : this.i18n.cancel;
    },
    /** @returns {String} */
    labelCambiar() {
      const estado = this.estadoFinal.deValor || '';
      return this.i18n.cambiarA(estado.toUpperCase());
    },
    /** @returns {String} */
    labelMantener() {
      return this.i18n.mantener();
    },
    /** @returns {String} */
    iconoCancel() {
      return this.disable ? 'icon-volver' : 'icon-cerrar';
    },
    /** @returns {String} */
    colorCancel() {
      return this.disable ? 'grey-7' : 'negative';
    },
    /** @returns {Array} */
    optionsDestinatario() {
      return this.selects?.[`destinatarios${this.form?.tipoDestinatario || ''}`] || [];
    },
    /** @returns {String} */
    tablaAnexosHeight() {
      return this.disableTexto ? '214px' : '160px';
    },
    /** @returns {String} */
    fullHeightClassRespuesta() {
      return this.disableRespuesta || !this.electron ? 'fullHeight' : '';
    },
    /** @returns {String} */
    tablaAnexosRespuestaHeight() {
      return this.disableRespuesta || !this.electron ? '214px' : '160px';
    },
    /** @returns {String} */
    fullHeightClass() {
      return this.disableTexto ? 'fullHeight' : '';
    },
    /** @returns {Array} */
    textoRequired() {
      const rule = [val => !!val || `${this.i18n.campoRequerido}`];
      return !this.disableTexto ? [...rule] : [];
    },
    /** @returns {Array} */
    respuestaRequired() {
      const rule = [val => !!val || `${this.i18n.campoRequerido}`];
      return !this.disableRespuesta ? [...rule] : [];
    },
    /** @returns {Array} */
    initialSelects() {
      const arr = [
        {
          name: 'destinatariosJU',
          alias: this.$ALIAS.consultaDestinatariosMinuta,
        },
        {
          name: 'destinatariosSE',
          alias: this.$ALIAS.consultaDestinatariosMinuta,
        },
        {
          name: 'extensionesConvertirPdf',
          alias: this.$ALIAS.consultaExtensionesConvertirPdf,
          params: {},
        },
      ];
      if (this.showEstado) {
        arr.push(
          {
            name: 'estadosDacion',
            alias: this.$ALIAS.consultaEstadosMinutas,
          },
          {
            name: 'estadosMinuta',
            alias: this.$ALIAS.consultaEstadosMinutas,
          },
          {
            name: 'estadosResolucion',
            alias: this.$ALIAS.consultaEstadosMinutas,
          }
        );
      }
      return arr;
    },
    /** @return {Array} */
    estados() {
      let arr;
      switch (this.form.tipoSolicitud) {
        case TIPO_DACION:
          arr = this.selects.estadosDacion || [];
          break;
        case TIPO_RESOLPTE:
          arr = this.selects.estadosResolucion || [];
          break;
        default:
          arr = this.selects.estadosMinuta || [];
      }
      return arr;
    },
    /** @returns {boolean} */
    showTipoDestinatarioSE() {
      return this.hints?.tiposDestinatarios?.includes('a') || false;
    },
    /** @returns {boolean} */
    showTipoDestinatarioJU() {
      return this.hints?.tiposDestinatarios?.includes('a') || false;
    },
    /** @returns {Array} */
    optionsTipoDestinatario() {
      const listaTipos = [];
      if (this.showTipoDestinatarioJU) {
        listaTipos.push({ label: this.hints?.labelTipoJU || 'Ponente', value: 'a' });
      }
      if (this.showTipoDestinatarioSE) {
        listaTipos.push({ label: this.hints?.labelTipoSE || 'LAJ', value: 'a' });
      }
      return listaTipos;
    },
    /** @returns {string} */
    portalTarget() {
      let target = null;
      if (!this.disableTexto) {
        target = 'accionesAnexos';
      } else if (!this.disableRespuesta && this.$electron) {
        target = 'accionesAnexosRespuesta';
      }
      return target;
    },
    /** @returns {boolean} */
    showEstado() {
      return this.isRespuesta || (this.disable && this.form.tipoSolicitud !== 'S');
    },
    /**@returns {Object} */
    estadoFinal() {
      return {};
    },
  },
  async mounted() {
    await this.load();
    this.$EventBus.$emit('setTitle', this.title);
    this.$EventBus.$emit('showFooter', true);
    this.$refs.selectorTipoEscrito?.focus();
  },
  methods: {
    async load() {
      try {
        this.$Loading.show(this.i18n.load(''));
        this.setStoreModule();
        const dataStore =
          this.$store.state[this.storeModule]?.[this.$STATE_NAMES.SOLICITUD_MINUTAS];
        if (!!dataStore) {
          Object.assign(this, JSON.parse(JSON.stringify(dataStore)));
          this.resetStore(this.$STATE_NAMES.SOLICITUD_MINUTAS);
          // cargamos los domumentos seleccionados en caelus si hubiera
          this.loadSelectedDocumentsFromCaelus();
        } else {
          await this.initialize();
        }
        this.title = this.i18n[`title${this.modoVentana}`](this.form?.deTipoSolicitud);
        this.behaviourPanelAlerts(this.$Helpers.initShortkey(this.configShortkey), true);
        this.$Helpers.initShortkey(this.configShortkey);
      } catch (error) {
        this.$Exceptions(error);
      } finally {
        this.renderPortal = true;
        this.loaded = true;
        this.$Loading.hide();
      }
    },
    async initialize() {
      if (this.$Helpers.isValidURL(this.url)) {
        const payloadSetup = {
          url: this.url,
          selects: this.initialSelects,
        };
        const { form, links, hints, selects } = await this.$Helpers.setup(payloadSetup);
        // Asignamos al this
        Object.assign(this, { form: form || this.form, links, hints, selects });
        // Controlamos el valor por defecto del tipoDestinatario y del destinatario
        this.form.tipoDestinatario = form.tipoDestinatario || hints.tipoDestinatarioDefecto || '';
        if (!this.form.coJuez) {
          this.form.coJuez = hints.destinatarioDefecto || '';
          this.handleInputDestinatario(this.form.coJuez);
        }
        if (this.isRespuesta) {
          const reg = this.estados?.find(x => x.coValor === this.form.coEstado);
          if (!reg) this.form.coEstado = '';
        }
        //Recuperamos documentos anexos
        this.consultaDocumentosSolicitud();
      } else {
        this.cancelCallback();
      }
    },

    async consultaDocumentosSolicitud() {
      let alias = '';
      switch (this.form.tipoSolicitud) {
        case TIPO_DACION:
          alias = this.$ALIAS.consultaDocumentosDacion;
          break;
        case TIPO_RESOLPTE:
          alias = this.$ALIAS.consultaDocumentosResolucionPendiente;
          break;
      }
      const url = this.$Helpers.getUrl(alias, this.links);
      // Llamamos 2 veces, para el origen y la respuesta
      if (url) {
        let params = { oriDes: 'ORI', maxRows: '99999' };
        const {
          data: { _embedded: listaDocs },
        } = await this.$APIService.getList(url, params);
        listaDocs?.forEach(x => this.form.anexos.push(x.data));
        params = { oriDes: 'DES', maxRows: '99999' };
      }
    },

    destinatarioAceptedDialog() {
      const reg = this.selectedIndex?.[0] || {};
      this.form.coJuez = reg?.coJuez || '';
      this.form.nombreDestinatario = reg?.nombreDestinatario || '';
    },
    destinatarioCanceledDialog() {
      this.selectedIndex = [];
    },
    handleInputDestinatario(valor) {
      const reg = this.optionsDestinatario?.find(x => x.coJuez === valor);
      this.form.coJuez = reg?.coJuez || '';
      this.form.nombreDestinatario = reg?.nombreDestinatario || '';
      this.selectedIndex = reg ? [reg] : [];
    },
    showInputDialogSelector(payload) {
      this.$ShortKey.removeShortkey();
      this.$ShortKey.initShortkey('');
    },

    goBack() {
      // limpiamos el store del bloque documental
      this.resetStore(this.$STATE_NAMES.BLOQUE_DOCUMENTAL);
      this.$router.back();
    },
    key_A_Callback() {
      if (this.renderPortal && !this.disable) {
        this.confirmAceptar();
      }
    },
    key_M_Callback() {
      this.mantenerEstado();
    },
    key_R_Callback() {
      this.cambiarEstado();
    },
    cancelCallback() {
      if (this.renderPortal) {
        this.goBack();
      }
    },
    closeConfirmEstadoCallback() {
      this.closeConfirmEstado();
    },
    cleanDestinatario() {
      this.handleInputDestinatario(null);
    },

    async deleteAnexo(row) {
      const filterArray = (arrayName, value) => {
        this.form[arrayName] = this.form[arrayName].filter(x => x.uuid !== value);
      };
      filterArray(this.isRespuesta ? 'anexosRespuesta' : 'anexos', row.uuid);
      // Si el valor borrdo ya estaba en BBDD agregamos a la lista de documentos eliminados
      if (row.nuOrd) {
        const newDocEliminar = Object.assign({}, row);
        newDocEliminar.eliminar = true;
        this.form.docsEliminar.push(newDocEliminar);
      }
    },

    gotoExpAdministrativos() {
      const url = this.$Helpers.getUrl(this.$ALIAS.formularioCaelus, this.links);
      if (url) {
        this.saveStore();
        this.$router.push({
          name: this.$ROUTER_NAMES.seleccionBloqueDocumental,
          params: {
            url,
            storeModule: this.storeModule,
            codigoProcedimiento: this.form.coProcon,
          },
        });
      }
    },
    loadSelectedDocumentsFromCaelus() {
      const bloqueDocumental = Object.assign(
        {},
        this.$store.state[this.storeModule][this.$STATE_NAMES.BLOQUE_DOCUMENTAL] || {}
      );
      const selectedDocuments = [...(bloqueDocumental?.selectedDocuments || [])];
      this.addDocumentos(
        selectedDocuments.map(doc => {
          const idArr = doc.id?.split('-') || [];
          const variableProps = doc.isDocExpediente
            ? {
                idExpteadm: idArr[0],
                nuOrdExpteadmxdoc: idArr[1].trim(),
              }
            : {
                coProcon: doc.coProcon,
                feTra: doc.feTra,
                nuOrdAco: doc.nuOrdAco,
              };

          return {
            uuid: doc.id,
            nombre: doc.descripcion,
            descripcion: doc.descripcion,
            direccionDoc: doc.direccionDoc,
            key: doc.key,
            ...variableProps,
          };
        })
      );
    },

    async gotoDocumentos() {
      const file = null;
      if (!file) return;
      const extension = file.name.split('.').pop();
      if (this.selects.extensionesConvertirPdf.includes(extension.toLowerCase())) {
        return this.$Notification.error(this.i18n.extensioNoPermitida(extension), 'icon-cerrar');
      }
      const { exist } = await this.invokeIpc('ping-drive', 'X');
      if (!exist) return this.$Notification.error(this.i18n.minDocuError, 'icon-cerrar');
      this.inputFile = file;
      if (extension.toLowerCase() !== 'pdf') {
        const destino = '';
        const carpetaTemporal = this.$store.state.configuracion.carpetaTemporal;
        this.outputFile = pathJoin([carpetaTemporal, `${destino}{${new Date().getTime()}}.pdf`]);
        const params = {
          inputPath: this.inputFile.path,
          outputPath: this.outputFile,
          pdfA: false,
        };
        this.connect();
        await this.$APIService.post(WS_URL, params);
      } else {
        this.outputFile = file.path;
        this.addDocumentos({
          uuid: this.outputFile,
          nombre: this.inputFile.name,
          descripcion: this.inputFile.name,
          direccionDoc: this.outputFile,
        });
      }
    },

    async invokeIpc(event, ...args) {
      if (!this.$electron) throw new Error(this.i18n.soloElectron(event));
      const result = await this.$electron.ipcRenderer.invoke(event, ...args);
      if (result.error) throw new Error(result.error);
      return result;
    },
    onError({ body }) {
      console.log(JSON.parse(body));
    },
    async onPdf({ body }) {
      try {
        const { id, message, mode, operation, stackTrace, status } = JSON.parse(body);
        if (status === 'ERROR') {
          this.$Helpers.initShortkey(this.configShortkey);
          this.$Notification.error(message, 'icon-cerrar');
          this.$Loading.hide();
        } else if (message === 'Documento pdf creado' /*status === 'SUCCESS'*/) {
          this.addDocumentos({
            uuid: this.outputFile,
            tipoDoc: '',
            nombre: this.inputFile.name,
            descripcion: this.inputFile.name,
            direccionDoc: this.outputFile,
          });
          this.tickleConnection();
          this.$Loading.hide();
        } else {
          this.$Loading.show(message);
        }
      } catch (err) {
        this.$Notification.error('', 'icon-cerrar');
      }
    },
    connect() {
      const subscribe = frame => {
        this.connected = true;
        this.stompClient.subscribe('/topic/error/notify', this.onError);
        this.stompClient.subscribe('/topic/pdf/notify', this.onPdf);
      };
      const error = error => {
        console.error(error);
        this.connected = false;
      };
      this.stompClient.connect({}, subscribe, error);
    },
    disconnect() {
      this.stompClient.disconnect(() => (this.connected = false));
    },
    tickleConnection() {
      this.connected ? this.disconnect() : this.connect();
    },
    addDocumentos(input) {
      // archivos puede ser un array o un solo elemento
      const archivos = Array.isArray(input) ? input : [input];
      const parse = ({
        uuid,
        nombre,
        descripcion,
        tipoDoc = '',
        direccionDoc = '',
        coProcon = '',
        feTra = '',
        nuOrdAco = '',
        idExpteadm = '',
        nuOrdExpteadmxdoc = '',
      }) => {
        return {
          uuid,
          nombre,
          descripcion,
          tipoDoc,
          direccionDoc,
          coProcon,
          feTra,
          nuOrdAco,
          idExpteadm,
          nuOrdExpteadmxdoc,
        };
      };
      const documentos = [];
      archivos.forEach(x => documentos.push(parse(x)));
      // Cargamos los documentos en la tabla eliminando duplicados
      const destino = this.isRespuesta ? this.form.anexosRespuesta : this.form.anexos;
      const filtrado = new Map(destino.map(x => [x.direccionDoc, x]));
      documentos.forEach(x => {
        if (!filtrado.has(x.direccionDoc)) {
          filtrado.set(x.direccionDoc, x);
        }
      });
      const arrayDocs = Array.from(filtrado.values());

      if (this.isRespuesta) {
        this.form.anexosRespuesta = arrayDocs;
      } else {
        this.form.anexos = arrayDocs;
      }
    },

    pressDocumentos() {
      this.$refs.btnDocumentos.$refs.inputFile.click();
    },

    key_D_Callback() {
      if (this.$electron && !this.disable && (!this.disableTexto || !this.disableRespuesta)) {
        this.pressDocumentos();
      }
    },

    async confirmAceptar() {
      if (await this.$refs.formSolicitud.validate()) {
        if (
          [TIPO_RESOLPTE, TIPO_DACION].includes(this.form.tipoSolicitud) &&
          this.isRespuesta &&
          this.form.coEstado !== this.estadoFinal.coValor
        ) {
          this.configConfirmEstado.message = this.i18n.mantenerCambiarEstado(
            this.estadoFinal.deValor || ''
          );
          this.configConfirmEstado.dialog = true;
          this.$Helpers.initShortkey(this.configShortkeyEstado);
        } else {
          this.configConfirm.dialog = true;
        }
      }
    },

    aceptar() {
      switch (this.modoVentana) {
        case MODO_ALTA:
          this.altaSolicitud();
          break;
        case MODO_EDICION:
          this.editarSolicitud();
          break;
        case MODO_RESPUESTA:
          this.responderSolicitud();
          break;
      }
    },

    async altaSolicitud() {
      try {
        let alias;
        switch (this.form.tipoSolicitud) {
          case TIPO_DACION:
            alias = this.$ALIAS.altaDacion;
            break;
          case TIPO_RESOLPTE:
            alias = this.$ALIAS.altaResolucionPendiente;
            break;
          default:
            alias = this.$ALIAS.altaSolicitudMinuta;
        }
        const url = this.$Helpers.getUrl(alias, this.links);
        if (url) {
          this.$Loading.show(this.i18n.altaSolicitud(this.form?.deTipoSolicitud?.toLowerCase()));
          //Generamos lista documentos a tratar
          this.form.listaDocs = this.form.anexos;
          const { data } = await this.$APIService.post(url, {});
          this.$Notification.success(
            this.i18n.altaSolicitudOK(this.form?.deTipoSolicitud?.toLowerCase()),
            'icon-check'
          );
          //Guardamos la posible lista de documentos del tipo ADJUNTO en mindocu
          await this.uploadFicheros(data?.content?.listaDocumentos || []);

          this.form.listaDocs = [];
          this.resetTableStore();
          this.goBack();
        }
      } catch (err) {
        this.$Exceptions(err);
      } finally {
        this.$Loading.hide();
      }
    },
    async editarSolicitud() {
      try {
        let alias;
        switch (this.form.tipoSolicitud) {
          case TIPO_DACION:
            alias = this.$ALIAS.actualizarDacion;
            break;
          case TIPO_RESOLPTE:
            alias = this.$ALIAS.actualizarResolucionPendiente;
            break;
          default:
            alias = this.$ALIAS.actualizarSolicitudMinuta;
        }
        const url = this.$Helpers.getUrl(alias, this.links);
        if (url) {
          this.$Loading.show(this.i18n.editSolicitud(this.form?.deTipoSolicitud?.toLowerCase()));
          //Generamos lista documentos a tratar (no todos los anexos y agregamos los que hay que eliminar)
          this.form.listaDocs = this.form.anexos.filter(
            x => !x.idSecuencial || x.nombre !== x.descripcion
          );
          this.form.docsEliminar?.forEach(x => this.form.listaDocs?.push(x));
          const { data } = await this.$APIService.patch(url, {});
          this.$Notification.success(
            this.i18n.editSolicitudOK(this.form?.deTipoSolicitud?.toLowerCase()),
            'icon-check'
          );
          //Guardamos la posible lista de documentos del tipo ADJUNTO en mindocu
          await this.uploadFicheros(data?.content?.listaDocumentos || []);
          this.form.docsEliminar = [];
          this.form.listaDocs = [];
          this.resetTableStore();
          this.goBack();
        }
      } catch (err) {
        this.$Exceptions(err);
      } finally {
        this.$Loading.hide();
      }
    },

    async responderSolicitud() {
      try {
        let url = '';
        switch (this.form?.tipoSolicitud) {
          case TIPO_DACION:
            url = this.$Helpers.getUrl(this.$ALIAS.actualizarRespuestaSolicitudDacion, this.links);
            break;
          case TIPO_RESOLPTE:
            url = this.$Helpers.getUrl(
              this.$ALIAS.actualizarRespuestaSolicitudResolucion,
              this.links
            );
            break;
          default:
            // Múltiple o tipo Solicitud minuta
            url = this.$Helpers.getUrl(this.$ALIAS.actualizarRespuestaSolicitudMinuta, this.links);
            this.form.listadoIdsSolicitud = this.listadoSolicitudes
              ?.filter(x => !!x.idSolicitud)
              .map(x => x.idSolicitud);
        }
        if (url) {
          const msgLoading = this.isMultiple
            ? this.i18n.responderMultiplesSolicitudes
            : this.i18n.responderSolicitud(this.form?.deTipoSolicitud?.toLowerCase());
          const msgOk = this.isMultiple
            ? this.i18n.responderMultiplesSolicitudesOk
            : this.i18n.responderSolicitudOK(this.form?.deTipoSolicitud?.toLowerCase());
          this.$Loading.show(msgLoading);
          //Generamos lista documentos a tratar (no todos los anexos más los que hay que eliminar)
          this.form.listaDocs = this.form.anexosRespuesta.filter(
            x => !x.idSecuencial || x.nombre !== x.descripcion
          );
          this.form.docsEliminar?.forEach(x => this.form.listaDocs?.push(x));
          const { data } = await this.$APIService.patch(url, {});
          this.$Notification.success(msgOk, 'icon-check');
          //Guardamos la posible lista de documentos del tipo ADJUNTO en mindocu
          await this.uploadFicheros(data?.content?.listaDocumentos || []);
          this.form.docsEliminar = [];
          this.form.listaDocs = [];
          this.resetTableStore();
          this.goBack();
        }
      } catch (err) {
        this.$Exceptions(err);
      } finally {
        this.$Loading.hide();
      }
    },
    showConfirm(payload) {
      this.$Helpers.initShortkey(this.$UTILS_SHORTKEYS.shortKeysConfirm(payload));
    },
    hideConfirm() {
      this.$Helpers.initShortkey(this.configShortkey);
      this.configConfirm.dialog = false;
    },
    getTooltipReferencia(row) {
      let tooltip = null;
      switch (row.tipo) {
        case TIPO_REF_PROCEDIMIENTO:
          tooltip = `${row.procedimiento || ''}`;
          break;
        case TIPO_REF_ACONTECIMIENTO:
          tooltip = '';
          tooltip = row.feTra
            ? `${tooltip} ${this.i18n.acontecimientoFecha}: <b>${row.feTra}</b>`
            : tooltip;
          tooltip = row.nuOrdAco
            ? `${tooltip} ${this.i18n.acontecimientoNumero}: <b>${row.nuOrdAco}</b>`
            : tooltip;
          tooltip = row.deAcontecimiento
            ? `${tooltip} <br/> ${this.i18n.descripcion}: <b>${row.deAcontecimiento}</b>`
            : tooltip;
          break;
      }
      return tooltip;
    },
    getTextoHtml(row) {
      return this.getValueWithEllipsis(`<b>${row.autor}</b>: ${row.texto}`, 75);
    },
    getTooltipTextoHtml(row) {
      const tooltip = this.getTooltip(`<b>${row.autor}</b>: ${row.texto}`, 75);
      return tooltip.length ? tooltip : null;
    },
    viewDocumento(row) {
      if (!row._hint?.borradorWE) {
        this.$file.open(row.direccionDoc);
      }
    },
    saveStore() {
      const storeKeys = ['hints', 'links', 'selects', 'form'];
      // generamos objeto con los atributos del data indicados en la storeKeys
      const data = Object.fromEntries(
        Object.entries(this.$data).filter(x => storeKeys.includes(x[0]))
      );
      const payload = {
        commit: this.$STATE_NAMES.SOLICITUD_MINUTAS,
        state: this.storeModule,
        data: data,
      };
      this.$store.commit('', payload);
    },
    resetStore(commitName) {
      const payload = {
        commit: commitName,
        state: this.storeModule,
        data: {},
      };
    },
    setStoreModule() {
      const newModuleName = `minutas`;
      const name = this.$route.params.storeModule || newModuleName;
      const registered = this.$store && this.$store.state && this.$store.state[name];
      this.$router.replace({
        name: this.$route.name,
        params: { ...this.$route.params, storeModule: name },
      });
      this.storeModule = name;
    },
    /** funcion que indica si el cambio de nombre de un anexo está deshabilitado o no*/
    disableDescAnexo(props) {
      return this.disableTexto;
    },
    disableDescAnexoRespuesta(props) {
      return this.disableRespuesta;
    },
    setDescEditable(lista, valor, payload) {
      const index = payload?.row?.__index;
      if (!isNaN(index)) {
        this.$set(lista, index, { ...lista[index], descEditable: valor });
      }
    },
    actualizarDescripcionAnexo(lista, props, payload) {
      // la tabla con virtual scroll hace un Object.freeze() sobre la propiedad data por lo que hay que actualiar los valores de manera manual
      const { row } = props;
      const index = lista.findIndex(item => item.uuid === row.uuid);
      this.$set(lista, index, { ...lista[index], descripcion: payload });
    },
    loadInputAnexo(payload) {
      this.$refs[`AnexoInput${payload.props.row.__index}`]?.focus();
    },

    async uploadFicheros(listaSalida) {
      try {
        if (this.$electron) {
          const listaIds = listaSalida.map(x => x.uuid);
          const listaUpload = this.form.listaDocs.filter(x => listaIds.includes(x.uuid));
          await Promise.allSettled(listaUpload.map(this.uploadFile));
        }
      } catch (error) {}
    },
    uploadFile(data) {
      return null;
    },
    mantenerEstado() {
      this.aceptar();
      this.closeConfirmEstado();
    },
    cambiarEstado() {
      this.form.coEstado = this.estadoFinal.coValor;
      this.aceptar();
      this.closeConfirmEstado();
    },
    closeConfirmEstado() {
      this.$Helpers.initShortkey(this.configShortkey);
      this.configConfirmEstado.dialog = false;
    },
  },
  mixins: [mixinsPanelAlerts],
};
</script>
