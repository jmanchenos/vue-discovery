import { Notify } from 'quasar';

/**
 * @namespace $Notification
 */
let notificationStatus = () => void 0;

const showNotify = (message, type, icon, position, duration = 5000, classes = '') => {
    /**
     * @memberof $Notification
     * @function showNotify
     * @description  Prototype que lanza notificaciones en pantalla. Estas notificaciones pueden ser de 4 tipos;
     *              - warning.-
     *              - success
     *              - info
     *              - error
     *
     * @param {string} message       - Mensaje a mostrar por pantalla.
     * @param {string} icon          - Icono a mostrar por pantalla (close,info,etc..)
     * @param {string} position      - Posición donde queremos que se posicione el mensaje
     * @param {string} duration      - Duración del mensaje
     * @example
     *       this.$Notification.info(this.i18n.createDomicilioOK, 'icon-info-circulo');
     *       this.$Notification.error(this.$t('errorMessages.errorOperacion', { error }), 'icon-cerrar');
     * @version 1.0.0
     */

    // Almacenamos todas la notificaciones en el localstore para tener un historico y que se pueda consultar mientras este la sesión abierta
    const createNotification = {
        message: message || '',
        caption: '',
        html: true,
        icon: icon || 'icon-info-circulo',
        position: position || 'top-right',
        color: type || 'primary',
        timeout: duration,
        textColor: 'white',
        classes: classes,
        actions: !duration && [
            {
                icon: 'icon-cerrar',
                color: 'white',
            },
        ],
    };

    saveNotification(createNotification);
    notificationStatus = Notify.create(createNotification);
    return notificationStatus;
};
const Notification = {
    install(Vue) {
        const vueLocal = Vue;
        vueLocal.prototype.$Notification = {
            warning: (message, icon, position, duration, classes) =>
                showNotify(message, 'warning', icon, position, duration, classes),
            success: (message, icon, position, duration, classes) =>
                showNotify(message, 'positive', icon, position, duration, classes),
            info: (message, icon, position, duration, classes) =>
                showNotify(message, 'info', icon, position, duration, classes),
            error: (message, icon, position, duration, classes) =>
                showNotify(message, 'negative', icon, position, duration, classes),
            closeNotification: () => {
                notificationStatus();
            },
        };
    },
};

const NotificacionJS = {
    warning: (message, icon, position, duration, classes) =>
        showNotify(message, 'warning', icon, position, duration, classes),
    success: (message, icon, position, duration, classes) =>
        showNotify(message, 'positive', icon, position, duration, classes),
    info: (message, icon, position, duration, classes) =>
        showNotify(message, 'info', icon, position, duration, classes),
    error: (message, icon, position, duration, classes) =>
        showNotify(message, 'negative', icon, position, duration, classes),
};

const saveNotification = createNotification => {
    const notification = Object.assign({}, createNotification);
    const now = new Date();
    const fecha = [
        {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        },
        {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        },
    ];
    const currentlyDate = fecha.map(item => new Intl.DateTimeFormat('es-ES', item).format(now));
    notification.date = `${currentlyDate[0]} a las ${currentlyDate[1]}`;
    if (window.localStorage.getItem('notifications')) {
        const currentLocalStorage = JSON.parse(window.localStorage.getItem('notifications'));
        currentLocalStorage.push(notification);
        window.localStorage.setItem('notifications', JSON.stringify(currentLocalStorage));
    } else {
        window.localStorage.setItem('notifications', JSON.stringify([notification]));
    }
};

export { Notification as default, NotificacionJS as NotifyJs };
