export const UtilsShortkeys = {
  /**
   * Listado con las teclas
   */
  KEYS: {
    A: 'a',
    B: 'b',
    C: 'c',
    D: 'd',
    E: 'e',
    F: 'f',
    G: 'g',
    H: 'h',
    I: 'i',
    J: 'j',
    K: 'k',
    L: 'l',
    M: 'm',
    N: 'n',
    Ñ: 'ñ',
    O: 'o',
    P: 'p',
    Q: 'q',
    R: 'r',
    S: 's',
    T: 't',
    U: 'u',
    V: 'v',
    W: 'w',
    X: 'x',
    Y: 'y',
    Z: 'z',
    ESC: 'Escape',
    ENTER: 'Enter',
    F7: 'F7',
  },
  /**
   * Devolvemos la configuración de shortkeys para los datepicker
   */
  shortKeysDatePicker: payload => [
    {
      key: {
        key: UtilsShortkeys.KEYS.A,
        altKey: true,
      },
      callback: payload.accept,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.C,
        altKey: true,
      },
      callback: payload.cancel,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.ESC,
        onlyKey: true,
      },
      callback: payload.cancel,
    },
  ],
  /**
   * Devolvemos la configuración de shortkeys para el input-dialog-selector
   */
  shortKeysInputDialogSelector: payload => [
    {
      key: {
        key: UtilsShortkeys.KEYS.A,
        altKey: true,
      },
      callback: payload.accept,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.C,
        altKey: true,
      },
      callback: payload.cancel,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.ESC,
        onlyKey: true,
      },
      callback: payload.cancel,
    },
  ],
  /**
   * Devolvemos la configuración de shortkeys para los confirm
   */
  shortKeysConfirm: payload => [
    {
      key: {
        key: UtilsShortkeys.KEYS.S,
        altKey: true,
      },
      callback: payload.accept,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.N,
        altKey: true,
      },
      callback: payload.cancel,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.ESC,
        onlyKey: true,
      },
      callback: payload.cancel,
    },
  ],
  shortKeysAcceptCancel: payload => [
    {
      key: {
        key: UtilsShortkeys.KEYS.A,
        altKey: true,
      },
      callback: payload.accept,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.C,
        altKey: true,
      },
      callback: payload.cancel,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.ESC,
        onlyKey: true,
      },
      callback: payload.cancel,
    },
  ],
  /**
   * Devolvemos la configuración de shortkeys para los modales del calendario
   */
  shortKeysCalendarAddDataModal: payload => [
    {
      key: {
        key: UtilsShortkeys.KEYS.A,
        altKey: true,
      },
      callback: payload.accept,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.C,
        altKey: true,
      },
      callback: payload.cancel,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.ESC,
        onlyKey: true,
      },
      callback: payload.cancel,
    },
  ],
  shortKeysCalendarEventInfoModal: payload => [
    {
      key: {
        key: payload.isEdit ? UtilsShortkeys.KEYS.M : UtilsShortkeys.KEYS.A,
        altKey: true,
      },
      callback: payload.acceptEdit,
    },
    {
      key: {
        key: payload.isEdit ? UtilsShortkeys.KEYS.B : UtilsShortkeys.KEYS.C,
        altKey: true,
      },
      callback: payload.cancelDelete,
    },
    {
      key: {
        key: UtilsShortkeys.KEYS.ESC,
        onlyKey: true,
      },
      callback: payload.cancel,
    },
  ],
};
