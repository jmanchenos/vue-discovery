/**
 * @namespace $Validate
 */

const validateRulesComponent = (reglas, value) => {
    /**
     * @memberof $Validate
     * @function validateRulesComponent
     * @description Se crea prototype $validate para poder lanzar la validacion del componente/formulario en cualquier parte de la aplidación sin
     *              necesidad de importar nada en ningún componente ni formulario.
     *              Se requiren dos parámetros de entrada. Un array con las rules del componente a validar y el valor a validar en la regla.
     *
     * @param {array}  reglas   - Reglas de los componentes a validar(por ejemplo: required, fecha no puede ser mayor que la fecha del sistema, etc).
     * @param {string||Array} value    - Valor a validar en la regla. En caso que haya reglas y el value sea de tipo array y esté vacío devuelve error.
     * @example
     * componentRules() {
     *   const ruleObligatorio = this.required ? [val => !!val || `El campo ${this.label} es obligatorio`] : [];
     *   const rules = [...ruleObligatorio, ...this.rules]
     *   return [...rules];
     * },
     * this.$Validate.validateRulesComponent(this.componentRules,value)
     * @version 1.0.0
     */
    let response = {};
    response.error = false;
    for (let i = 0; i < reglas.length; i++) {
        const rule = reglas[i];
        let result = null;
        if (Array.isArray(value) && value.length === 0) {
            response = {
                errorMessage: rule(''),
                error: true,
            };
        } else {
            result = rule(value);
            if (typeof result === 'string') {
                response = {
                    errorMessage: result,
                    error: !!result,
                };
                break;
            } else {
                response = {
                    errorMessage: '',
                    error: false,
                };
            }
        }
    }
    return response;
};

const Validation = {
    install(Vue) {
        const vueLocal = Vue;
        vueLocal.prototype.$Validate = {
            validateRulesComponent: (reglas, value) => validateRulesComponent(reglas, value),
        };
    },
};

export default Validation;
