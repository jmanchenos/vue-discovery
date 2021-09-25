<template>
  <div class="container" ref="container">
    <!-- Panel de Filtros -->
    <sg-form ref="formAnularAsuntos">
      <sg-card title>
        <template v-slot:body>
          <div class="row q-col-gutter-sm">
            <div class="col-2"></div>
            <div class="col-10">
              <sg-option-group
                ref="tipologia"
                v-model="form.tipologia"
                :options="optionsTipologias"
                :label="i18n.tipologia"
                :inline="true"
                @input="changeTipologia"
              />
            </div>
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-3 q-mt-md">
              <sg-input-input-numero-year
                ref="numRegistro"
                :input1.sync="form.numeroDec"
                :input2.sync="form.anyoDec"
                :label1="i18n.numeroDec"
                :label2="i18n.yearDec"
                :required1="true"
                :required2="true"
              />
            </div>
          </div>
        </template>
        <template v-slot:actions>
          <div class="col-12 text-right">
            <sg-button
              ref="btnClean"
              :label="i18n.clean"
              icon="icon-limpiar"
              class="q-ml-sm"
              :index-underlined="0"
              @click="clean"
            />
            <sg-button
              ref="btnSearch"
              :label="i18n.search"
              :disable="!searchEnable"
              icon="icon-buscar"
              class="q-ml-sm"
              :index-underlined="0"
              @click="search"
            />
          </div>
        </template>
      </sg-card>
    </sg-form>

    <!-- Panel de tabla de resultados -->
    <sg-card title>
      <template v-slot:body>
        <div class="row">
          <sg-table
            ref="tablaBajaAsuntos"
            virtual-scroll
            row-key="id"
            :data="tableData"
            class="col"
            :columns="tableConfig.columns"
            :wrap-cells="true"
            :actions-icons="tableConfig.icons"
            @view-baja-asuntos="viewBajaAsuntos"
            @confirm-delete-baja-asuntos="confirmDeleteBajaAsuntos"
          ></sg-table>
        </div>
      </template>
    </sg-card>

    <!-- Panel de botones -->
    <portal to="footer-destination-buttons">
      <div class="container">
        <div class="row q-col-gutter-sm">
          <div class="col-12 text-right">
            <sg-button
              ref="btnClose"
              :label="i18n.close"
              color="negative"
              icon="icon-cerrar"
              class="q-ml-sm"
              :index-underlined="0"
              @click="cancel"
            />
          </div>
        </div>
      </div>
    </portal>
    <sg-confirm
      ref="confirmDeleteBajaAsuntos"
      :config="configDeleteConfirm"
      @accept="acceptDelete"
      @cancel="cancelDelete"
      @show-confirm="showConfirm"
      @hide-confirm="$Helpers.initShortkey(configShortkey)"
    >
      <template v-slot:subbody>
        <div class="full-width">
          <sg-text-area v-model="motivo" :min-rows="3" :label="i18n.motivo" maxlength="2000" />
        </div>
      </template>
    </sg-confirm>
    <sg-confirm
      ref="confirmDeleteConEscritos"
      :config="configDeleteConfirmEscritos"
      @accept="acceptDeleteEscritos"
      @cancel="cancelDeleteEscritos"
      @show-confirm="showConfirm"
      @hide-confirm="$Helpers.initShortkey(configShortkey)"
    />
  </div>
</template>

<script>
import BajaAsuntosApi from '@/models/Reparto/Infraestructura/Bajas/BajaAsuntos/BajaAsuntosApi';
import BajaAsuntosFront from '@/models/Reparto/Infraestructura/Bajas/BajaAsuntos/BajaAsuntosFront';
import setup from '@/mixins/views/setupMixin';
import mixinsPanelAlerts from '@/mixins/panelAlerts';
import repartoModule from '@/store/modules/reparto';
import SgInputInputNumeroYear from '@/components/InputInputNumeroYear.vue';
import { TipologiaColumnParser } from '@/utils/parser';
import { MUTATIONS, TODOS, TIPOS_ESTADO, TIPOS_REGISTRO, TIPOS_ORDEN } from '@/utils/constants';
import $date from '@/utils/date';

const { RESET_STATE, SAVE_STATE, SET_HELP_LINK } = MUTATIONS;
const { ASUNTO, RECURSO, AUX_JUDICIAL, EJECUCION, EJECUTORIA, PERSONACION } = TIPOS_REGISTRO;
const TIPOLOGIAS = [ASUNTO, RECURSO, AUX_JUDICIAL, EJECUCION, PERSONACION];
const { MTM } = TIPOS_ESTADO;

export default {
  name: 'view-bajaAsuntos-list',
  props: {
    url: {
      type: String,
      required: true,
    },
  },
  data() {
    const i18n = {
      title: this.$t('viewsTitles.viewsTitlesBajaAsuntos'),
      close: this.$t('generic.close'),
      search: this.$t('generic.search'),
      clean: this.$t('generic.clean'),
      delete: this.$t('generic.delete'),
      deleteBajaAsuntos: this.$t('notifyMessages.delete', {
        campo: this.$t('generic.asunto'),
      }),
      deleteBajaAsuntosConfirm: this.$t('confirmMessages.delete', {
        campo: this.$t('generic.asunto'),
      }),
      deleteBajaAsuntosOK: this.$t('notifyMessages.deleteOK', {
        campo: this.$t('generic.asunto'),
      }),
      optionTodos: this.$t('generic.todos'),
      optionAsuntos: this.$t('generic.asuntos'),
      optionRecursos: this.$t('generic.recursos'),
      optionEjecuciones: this.$t('generic.ejecutoria'),
      optionPersonaciones: this.$t('generic.personacion'),
      optionExhortos: this.$t('generic.exhortos'),
      numeroDec: this.$t('generic.nuRegistro'),
      yearDec: this.$t('generic.year'),
      colNuDec: this.$t('generic.nuRegistro'),
      colFechaPresentacion: this.$t('generic.fePresentacion'),
      colDestino: this.$t('generic.destino'),
      colCodigoEstado: this.$t('generic.estado'),
      colCodigoClaseReparto: this.$t('generic.claseReparto'),
      colTipologia: this.$t('generic.tipologia'),
      consulta: this.$t('generic.consulta'),
      anulacionAsuntos: this.$t('bajaAsuntos.anulacionAsuntos'),
      confirmBajaAsuntos: params => this.$t('bajaAsuntos.confirmBajaAsuntos', params),
      optionEjecuciones: orden =>
        orden === '2' ? this.$t('generic.ejecutorias') : this.$t('generic.ejecuciones'),
      confirmEscritos: this.$t('bajaAsuntos.confirmEscritos'),
      messageDebeHaberFiltros: this.$t('bajaAsuntos.messageDebeHaberFiltros'),
      motivo: this.$t('generic.motivo'),
      [TODOS]: this.$t('generic.todos').toUpperCase(),
      [ASUNTO]: this.$t('generic.asuntos').toUpperCase(),
      [RECURSO]: this.$t('generic.recursos').toUpperCase(),
      [AUX_JUDICIAL]: this.$t('generic.auxiliosJudiciales').toUpperCase(),
      [EJECUCION]: this.$t('generic.ejecuciones').toUpperCase(),
      [EJECUTORIA]: this.$t('generic.ejecutorias').toUpperCase(),
      [PERSONACION]: this.$t('generic.personaciones').toUpperCase(),
    };
    return {
      i18n,
      tipologiaParser: new TipologiaColumnParser(),
      links: {},
      hints: {},
      tableData: [],
      paramsSearch: {},
      context: this.$store.getters['auth/user'].contextoActual,
      storeModule: null,
      existeAlerta: false,
      form: {},
      rowDetalle: null,
      urlSearch: '',
      motivo: '',
      configDeleteConfirm: {
        dialog: false,
        message: i18n.confirmBajaAsuntos,
      },
      configDeleteConfirmEscritos: {
        dialog: false,
        message: i18n.confirmEscritos,
      },
      tableConfig: {
        columns: [
          {
            name: 'nuDec',
            label: i18n.colNuDec,
            field: row => this.getColumnaSeparadorBarra(row.nuDec, row.anDec),
            sortable: true,
            sort: (a, b, rowA, rowB) =>
              `${rowA.anDec}${rowA.nuDec}` > `${rowB.anDec}${rowB.nuDec}` ? 1 : -1,
            width: '10%',
            align: 'left',
          },
          {
            name: 'fechaPresentacion',
            label: i18n.colFechaPresentacion,
            field: row => row.fechaPresentacion,
            sortable: true,
            sort: (a, b, rowA, rowB) =>
              $date.compareDates(rowA.fechaPresentacion, rowB.fechaPresentacion),
            align: 'left',
          },
          {
            name: 'tiOrgDestino',
            label: i18n.colDestino,
            field: row => this.getColumnaSeparadorEspacio(row.tiOrgDestino, row.nuOrgDestino),
            sortable: true,
            sort: (a, b, rowA, rowB) =>
              `${rowA.tiOrgDestino}${rowA.nuOrgDestino}` >
              `${rowB.tiOrgDestino}${rowB.nuOrgDestino}`
                ? 1
                : -1,
            align: 'left',
          },
          {
            name: 'codigoEstado',
            label: i18n.colCodigoEstado,
            field: row => this.getCodigoEstado(row),
            sortable: true,
            align: 'left',
          },
          {
            name: 'codigoClaseReparto',
            label: i18n.colCodigoClaseReparto,
            field: row =>
              this.getColumnaSeparadorEspacio(row.codigoClaseReparto, row.descripcionClaseReparto),
            sortable: true,
            sort: (a, b, rowA, rowB) =>
              `${rowA.codigoClaseReparto}${rowA.descripcionClaseReparto}` >
              `${rowB.codigoClaseReparto}${rowB.descripcionClaseReparto}`
                ? 1
                : -1,
            align: 'left',
          },
          {
            name: 'tipologia',
            label: i18n.colTipologia,
            field: row => this.getTipologia(row.tipologia),
            sortable: true,
            align: 'left',
          },
          {
            name: 'actions',
          },
        ],
        icons: [
          {
            icon: 'icon-consulta',
            eventName: 'view-baja-asuntos',
            color: '',
            tooltip: i18n.consulta,
            conditionColor: () => '',
            disabled: row =>
              !this.$UtilsGeneric.getUrl(this.$ALIAS.formularioAsunto, row._links).status,
            show: () => true,
          },
          {
            icon: 'icon-borrar',
            eventName: 'confirm-delete-baja-asuntos',
            tooltip: i18n.anulacionAsuntos,
            color: '',
            conditionColor: () => '',
            show: () => true,
          },
        ],
      },
      configShortkey: [
        {
          key: {
            key: this.$UTILS_SHORTKEYS.KEYS.B,
            altKey: true,
          },
          callback: this.searchCallback,
        },
        {
          key: {
            key: this.$UTILS_SHORTKEYS.KEYS.L,
            altKey: true,
          },
          callback: this.key_L_Callback,
        },
        {
          key: {
            key: this.$UTILS_SHORTKEYS.KEYS.C,
            altKey: true,
          },
          callback: this.cancelCallback,
        },
        {
          key: {
            key: this.$UTILS_SHORTKEYS.KEYS.ENTER,
            onlyKey: true,
          },
          callback: this.searchCallback,
        },
        {
          key: {
            key: this.$UTILS_SHORTKEYS.KEYS.ESC,
            onlyKey: true,
          },
          callback: this.cancelCallback,
        },
      ],
    };
  },
  computed: {
    searchEnable() {
      return !!this.form.numeroDec && !!this.form.anyoDec;
    },
    optionsTipologias() {
      const options =
        this.hints?.tipologias?.filter(tipologia => TIPOLOGIAS.includes(tipologia)) || [];
      // Agregamos al principio de la lista la opcion TODOS
      if (options.length > 0) {
        options.unshift(TODOS);
      }
      return options.map(tipologia => {
        const label =
          tipologia === EJECUCION && this.context.coOrd === TIPOS_ORDEN.PENAL
            ? this.i18n[EJECUTORIA]
            : this.i18n[tipologia];
        return {
          label,
          value: tipologia,
        };
      });
    },
  },
  watch: {
    searchEnable: {
      immediate: true,
      handler(newValue) {
        if (newValue && this.existeAlerta) {
          this.existeAlerta = false;
          this.$Notification.closeNotification();
        }
      },
    },
  },

  async mounted() {
    await this.load();
    this.$nextTick(() => {
      this.$refs.tipologia?.focus();
    });
    this.behaviourPanelAlerts(() => this.$Helpers.initShortkey(this.configShortkey), true);
    this.$Helpers.initShortkey(this.configShortkey);
    this.$EventBus.$emit('setTitle', this.i18n.title);
    this.$EventBus.$emit('showFooter', true);
  },
  beforeRouteLeave(to, from, next) {
    // eliminamos la notificacion por si estuviese activa
    this.$Notification.closeNotification();
    next();
  },
  beforeDestroy() {
    this.$EventBus.$emit('setTitle', '');
  },

  methods: {
    async load() {
      try {
        this.$Loading.show();
        this.manageStoreModuleRegistration();
        await this.initialize();
        // Mostramos alerta si no se cumplen criterios de filtro obligatorio
        if (!this.searchEnable) {
          this.existeAlerta = true;
          this.$Notification.info(
            this.i18n.messageDebeHaberFiltros,
            'icon-info-circulo',
            'top-right',
            0
          );
        }
      } catch (err) {
        this.$Exceptions(err);
      } finally {
        this.$Loading.hide();
      }
    },
    manageStoreModuleRegistration() {
      const name = this.$route.query?.storeModule || `reparto${new Date().getTime()}`;
      const registered = this.$store.state[name];
      if (!registered) {
        this.$store.registerModule(name, repartoModule);
        this.$router.replace({
          query: { storeModule: name },
        });
      }
      this.storeModule = name;
    },
    async initialize() {
      this.storeModule = this.$route?.query?.storeModule || '';
      // Comprobamos si tenemos datos en el store
      const dataStore = await this.$store.state[this.storeModule][this.$STATE_NAMES.BAJA_ASUNTOS];
      if (dataStore) {
        // precargamos del store
        Object.assign(this, {
          form: { ...dataStore.form },
          links: { ...dataStore.links },
          hints: { ...dataStore.hints },
          urlSearch: dataStore.urlSearch,
          tableData: [...dataStore.tableData],
        });
        const payload = {
          commit: this.$STATE_NAMES.BAJA_ASUNTOS,
          state: this.storeModule,
        };
        await this.$store.commit(RESET_STATE, payload);
      } else {
        // Inicializacion de datos del formulario
        if (this.$Helpers.isValidURL(this.url)) {
          const data = await this.setup(this.url);
          Object.assign(this, data);
          const url = this.$UtilsGeneric.getUrl(this.$ALIAS.consultaProcedimientosBaja, this.links);
          if (url.status) {
            this.urlSearch = url.response;
          } else {
            this.$Notification.error(url.response);
            this.urlSearch = '';
          }
          // Inicializacion de parametros
          this.resetFilters();
          this.$store.commit(SET_HELP_LINK, this.links.ayuda);
        } else {
          this.cancel();
        }
      }
    },
    async search() {
      try {
        if (this.$refs.formAnularAsuntos?.validate()) {
          this.$Loading.show();
          this.tableData = [];
          if (this.$Helpers.isValidURL(this.urlSearch)) {
            this.paramsSearch = new BajaAsuntosApi(this.form);
            const { data } = await this.$APIService.get(this.urlSearch, this.paramsSearch);
            if (data._embedded) {
              data._embedded.forEach(item => {
                this.tableData.push(new BajaAsuntosFront(item));
              });
            }
          } else {
            this.cancel();
          }
        }
      } catch (err) {
        this.$Exceptions(err);
      } finally {
        this.$Loading.hide();
      }
    },
    getTipologia(rowTipologia) {
      let tipologia = rowTipologia;
      if (this.context.coOrd === TIPOS_ORDEN.PENAL && tipologia === EJECUCION) {
        tipologia = EJECUTORIA;
      }
      return this.tipologiaParser.getText(tipologia).toUpperCase();
    },
    clean(resetFilter = true) {
      this.tableData = [];
      if (resetFilter) {
        this.$refs.formAnularAsuntos?.resetValidation();
        this.resetFilters();
        this.$refs.numRegistro?.resetValidation();
        this.$nextTick(() => {
          this.$refs.numRegistro?.focus();
        });
      }
    },
    resetFilters() {
      this.form = {
        tipologia: this.form.tipologia || TODOS,
        numeroDec: '',
        anyoDec: '',
      };
    },
    showConfirm(payload) {
      this.$Helpers.initShortkey(this.$UTILS_SHORTKEYS.shortKeysConfirm(payload));
    },
    acceptDelete() {
      this.configDeleteConfirm.dialog = false;
      this.configDeleteConfirmEscritos.dialog = true;
    },
    cancelDelete() {
      this.configDeleteConfirm.dialog = false;
      this.motivo = '';
      this.rowDetalle = null;
    },
    async acceptDeleteEscritos() {
      await this.eliminar(true);
      this.configDeleteConfirmEscritos.dialog = false;
      this.motivo = '';
    },
    async cancelDeleteEscritos() {
      await this.eliminar(false);
      this.configDeleteConfirmEscritos.dialog = false;
      this.motivo = '';
    },
    async eliminar(flag) {
      this.$Loading.show(this.i18n.deleteBajaAsuntos);
      try {
        const url = this.$UtilsGeneric.getUrl(
          this.$ALIAS.anularProcedimiento,
          this.rowDetalle._links
        );
        if (url.status) {
          const params = { anulacionEscritosAsociados: flag, motivo: this.motivo };
          await this.$APIService.put(url.response, params);
          this.$Notification.success(this.i18n.deleteBajaAsuntosOK);
          this.tableData = [];
          await this.search();
        } else {
          this.$Notification.error(url.response);
        }
      } catch (err) {
        this.$Exceptions(err);
      } finally {
        this.$Loading.hide();
      }
    },

    getColumnaSeparadorBarra(campo1, campo2) {
      const separador = campo1 && campo2 ? ' / ' : '';
      return `${campo1}${separador}${campo2}`;
    },
    getColumnaSeparadorEspacio(campo1, campo2) {
      const separador = ' ';
      return `${campo1}${separador}${campo2}`;
    },
    async cancel() {
      // Desregistramos el modulo de reparto pues ya no lo necesitamos
      const registered = this.$store.state[this.storeModule] || '';
      if (registered) {
        this.$store.unregisterModule(this.storeModule);
      }
      this.$router.back();
    },

    async getList(url, params) {
      return this.$APIService.getList(url, params, BajaAsuntosFront);
    },
    changeTipologia(tipo) {
      this.clean(false);
    },
    searchCallback() {
      if (this.searchEnable) {
        this.search();
      }
    },
    cancelCallback() {
      this.cancel();
    },
    key_L_Callback() {
      this.clean();
    },
    confirmDeleteBajaAsuntos(row) {
      this.rowDetalle = row;
      this.configDeleteConfirm.dialog = true;
      this.configDeleteConfirm.message = this.i18n.confirmBajaAsuntos({
        numeroRegistro: `${row.nuDec}` + ` / ` + `${row.anDec}`,
      });
    },
    confirmDeleteConEscritos() {
      this.configDeleteConfirm.dialog = true;
    },
    viewBajaAsuntos(row) {
      //Guardamos en el store los datos del form y links, hints, etc
      const payload = {
        commit: this.$STATE_NAMES.BAJA_ASUNTOS,
        state: this.storeModule,
        data: Object.assign(
          {},
          {
            form: this.form,
            links: this.links,
            hints: this.hints,
            urlSearch: this.urlSearch,
            tableData: this.tableData,
          }
        ),
      };
      this.$store.commit(SAVE_STATE, payload);
      const url = this.$UtilsGeneric.getUrl(this.$ALIAS.formularioAsunto, row._links);
      if (url.status) {
        this.$router.push({
          name: row._hint.formulario,
          params: {
            url: url.response,
            disable: true,
            isRevision: true,
          },
        });
      } else {
        this.$Notification.error(url.response);
      }
    },
    getCodigoEstado(row) {
      let codigoEstado = row.codigoEstado;
      if (row.codigoEstado === MTM && row.tipologia === PERSONACION) {
        codigoEstado = '';
      }
      return row.codigoMotivo ? `${codigoEstado} ${row.codigoMotivo}` : codigoEstado;
    },
  },

  components: {
    SgInputInputNumeroYear,
  },
  mixins: [setup, mixinsPanelAlerts],
};
</script>
