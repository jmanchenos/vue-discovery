/**
 * @namespace $WebSocket
 * @description Plugin para la gestion de mensajes mediante WebSockets
 * @version 1.0.0
 */

import axios from '@/plugins/axios';
import store from '@/store';
import SockJS from 'sockjs-client';
import Stomp from 'webstomp-client';
import i18n from '@/plugins/i18n';
import { NotifyJs as Notification } from '@/plugins/notification/index.js';
import { logger } from '@/utils/logger';
import { uid as generateUid } from 'quasar';
import { WEB_SOCKET_STATUS } from '@/utils/constants';
import { exceptionHandler } from '@/plugins/exceptions';
import { open as fileOpener } from '@/plugins/fileOpener';

const { CONNECTED, CONNECTING, DISCONNECTED, DISCONNECTING } = WEB_SOCKET_STATUS;

const log = message =>
    logger({
        message: `WebSocket: ${message}`,
        uid: generateUid(),
        source: 'front',
    });

export const defaultUrl = new URL(
    'ws',
    `${axios.defaults.baseURL || window.location.origin}${process.env.VUE_APP_WEBSOCKET_ENDPOINT}`
).href;

export const downloadFile = function (response) {
    store.dispatch('GET_USER_DOWNLOADS_LIST').catch(exceptionHandler);
    const data = JSON.parse(response?.body) || {};
    Notification.info(
        i18n.t('notifyMessages.informeGeneradoCorrectamente', { campo: data.nombreInforme }),
        ' ',
        'top-right',
        5000,
        '',
        [
            {
                icon: 'icon-invertir-abajo',
                color: 'white',
                handler: () => fileOpener(data.urlDescarga, data.extension),
            },
        ],
        {
            url: data.urlDescarga,
            extension: data.extension,
            id: data.idInforme,
            type: 'download',
            icon: 'icon-invertir-abajo',
            color: 'green',
            background: 'primary',
        }
    );
};

export const defaultSubscriptions = user => [
    {
        id: `canal_mensaje-${user}`,
        url: `/canal/mensaje/${user}`,
        callback: downloadFile,
    },
];

export class WebSocket {
    constructor({
        url = defaultUrl,
        subscriptions = [],
        headers = {},
        onConnectionSuccess = () => {},
        onConnectionError = () => {},
        autoConnect = true,
    }) {
        this.status = DISCONNECTED;
        this.socket = null;
        this.stompClient = null;
        this.subscriptions = new Map();
        this.connectionConfig = {
            url,
            headers,
            onSuccess: frame => subscriptions?.forEach(sub => this.subscribe(sub)) && onConnectionSuccess?.(frame),
            onError: error => {
                onConnectionError?.(error);
            },
        };

        if (url && autoConnect) this.connect(this.connectionConfig);
    }
    connect({
        url = this.connectionConfig.url,
        headers = this.connectionConfig.headers,
        onSuccess = this.connectionConfig.onSuccess,
        onError = this.connectionConfig.onError,
    }) {
        if (!url) {
            log('Url is undefined');
            return;
        }
        if ([CONNECTED, CONNECTING].includes(this.status)) {
            return this;
        }
        this.socket = new SockJS(url);
        this.stompClient = Stomp.over(this.socket);
        this.connectionConfig = { url, headers, onSuccess, onError };
        const onSuccessCB = frame => {
            console.info('WebSocket: Connected', frame);
            this.status = CONNECTED;
            onSuccess?.(frame);
        };
        const onErrorCB = error => {
            log(error?.reason || 'Connection failed');
            this.status = DISCONNECTED;
            onError?.(error);
        };
        this.stompClient.connect(headers, onSuccessCB, onErrorCB);
        this.status = CONNECTING;
        return this;
    }

    disconnect() {
        this.status = DISCONNECTING;
        this.subscriptions.forEach((_, index) => this.unsubscribe(index));
        this.stompClient?.disconnect(() => {
            this.status = DISCONNECTED;
            console.info('WebSocket: Disconnected');
        });
        return this;
    }

    send({ url = '', headers = {}, body = '' }) {
        if (this.status !== CONNECTED) log('Connect before send');
        try {
            const parsedBody = body && typeof body === 'string' ? body : (body && JSON.stringify(body)) || '';
            this.stompClient.send(url, parsedBody, headers);
        } catch (error) {
            log(error.message);
        }
        return this;
    }

    subscribe({ url = '', callback = () => {}, id = null }) {
        if (!url) {
            log('No subscription url');
            return;
        }
        if (this.status !== CONNECTED) {
            log('Connect before subscribe');
            return;
        }
        const idToSubscribe = id ?? url;
        if (this.subscriptions.has(idToSubscribe)) {
            this.unsubscribe(idToSubscribe);
        }
        const { id: subscriptionId, unsubscribe } = this.stompClient.subscribe(url, callback, {
            id: idToSubscribe,
        });
        this.subscriptions.set(subscriptionId, unsubscribe);
        return this;
    }

    unsubscribe(subscriptionId) {
        const unsubscribe = this.subscriptions.get(subscriptionId);
        if (unsubscribe) {
            this.subscriptions.delete(subscriptionId);
            console.log(subscriptionId);
            unsubscribe();
        }
        return this;
    }
}

export default {
    install: Vue => {
        const instance = new WebSocket({ autoConnect: false });
        const vueLocal = Vue;
        vueLocal.prototype.$WebSocket = instance;
    },
};
