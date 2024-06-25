import { API_METHODS, JSON2PDF_URL } from '@/utils/constants';
import axios from '@/plugins/axios';
import store from '@/store';

const { POST } = API_METHODS;
const messages = {
    soloApp: 'La funcionalidad solo está disponible en la aplicación de escritorio',
};
const JSON2PDF = {};

const headerMerge = header => {
    const [fecha, hora] = new Date().toLocaleString('es-ES').split(' ');
    const {
        state: {
            auth: {
                user: {
                    contextoActual: { tipoOrgano, organo, poblacion, orden },
                    coFuncionario,
                },
            },
        },
    } = store;

    return {
        ...{
            tipoOrgano: tipoOrgano.deTiOrg,
            organo: organo.deOrg,
            provincia: organo.provincia,
            poblacion: poblacion.dePob,
            orden: orden.deCoOrd,
            usuario: coFuncionario,
            titulo: '',
            fecha,
            hora,
            filtros: [],
        },
        ...header,
    };
};

const getValue = (row, col) => (typeof col.field === 'function' ? col.field(row) : row[col.field]);

const getCellValue = (row, col) => {
    const val = getValue(row, col);
    return col.format !== void 0 ? col.format(val, row) : val;
};

const getExtras = (row, extrarows) => {
    return extrarows.map(item => {
        const data = getCellValue(row, item);
        const morerows = (item.extrarows || []).map(extra => {
            const extras = getValue(row, item).map(data => getCellValue(data, extra));
            return {
                ...extra,
                data: extras.length ? extras : null,
            };
        });
        return {
            ...item,
            data,
            ...(morerows.length ? { extrarows: morerows } : {}),
        };
    });
};

JSON2PDF.install = Vue => {
    const vueLocal = Vue;
    vueLocal.prototype.$json2pdf = {
        create: async ({
            name,
            content = [],
            header = null,
            tableLayouts = {},
            pageSize = 'LEGAL',
            pageOrientation = 'landscape',
            pageMargins = [40, 103.5, 40, 60],
            defaultStyle = { fontSize: 8 },
        }) => {
            const { $electron, $Notification, $Loading } = vueLocal.prototype;
            if (!$electron) {
                $Notification.error(messages.soloApp);
                return;
            }
            try {
                $Loading.show();
                const response = await axios({
                    method: POST,
                    url: JSON2PDF_URL,
                    data: {
                        name,
                        header,
                        content,
                        pageSize,
                        pageOrientation,
                        tableLayouts,
                        pageMargins,
                        defaultStyle,
                    },
                });
                return response;
            } catch (error) {
                $Notification.error(error);
                throw error;
            } finally {
                $Loading.hide();
            }
        },
    };
};

export default JSON2PDF;
