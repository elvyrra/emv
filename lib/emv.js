/*global define, module, exports*/

/**
 * emv.js {{ version }}
 *
 * @author Elvyrra S.A.S
 * @license http://rem.mit-license.org/ MIT
 */
'use strict';

(function(global, factory) {
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        global.EMV = factory();
    }
})(this, () => {
    /**
     * Generate a unique id
     * @returns {[type]} [description]
     */
    function guid() {
        /**
         * Build a random 4 characters string
         * @returns {string} The generated random string
         */
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }

        return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
    }

    /**
     * Detect if a value is a primitive value
     *
     * @param {mixed} variable The varname to test
     * @returns {boolean} True if the variable is primitive
     */
    function isPrimitive(variable) {
        const types = [
            'string',
            'number',
            'boolean',
            'undefined',
            'symbol'
        ];

        return types.indexOf(typeof variable) !== -1 || variable === null || variable instanceof Date;
    }

    /**
     * Escape the special chars of a regular expression
     * @param   {string} str The string to escape
     * @returns {string}     The escaped string
     */
    function escapeRegExp(str) {
        return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    }


    /**
     * This class describes errors thrown by EMV
     */
    class EMVError extends Error {
        /**
         * Constructor
         * @param   {string} message The error message
         */
        constructor(message) {
            const fullMessage = `EMV Error : ${message}`;

            super(fullMessage);
        }
    }

    /**
     * This class describes the behavior of observable data in EMV engine.
     * This is the most important class in EMV
     */
    class EMVObservable {
        /**
         * Constructor
         * @param  {Object} initValue       The initial value to set on the observable
         * @param  {EMV} $root              The root EMV instance
         * @param  {EMVObservable} $parent  The parent object, containing this one
         * @param  {string} upperKey        The key to retrieve this object from the parent object
         */
        constructor(initValue, $root, $parent, upperKey) {
            Object.defineProperties(this, {
                $computed : {
                    value : {}
                },
                $observed : {
                    value : new Set([])
                },
                $callers : {
                    value : {}
                },
                $watchers : {
                    value : {}
                },
                $root : {
                    value    : $root || this,
                    writable : true
                },
                $parent : {
                    value    : $parent,
                    writable : true
                },
                $this : {
                    value    : this,
                    writable : true
                },
                $directives : {
                    value : {}
                },
                $object : {
                    value    : initValue,
                    writable : true
                },
                $additionalProperties : {
                    value    : new Set([]),
                    writable : true
                }
            });

            Object.keys(initValue).forEach((key) => {
                this.$observe(key, initValue[key], upperKey);
            });

            if (initValue.constructor.name !== 'Object') {
                Object.getOwnPropertyNames(initValue.constructor.prototype).forEach((functionName) => {
                    if (!this.constructor.prototype[functionName]) {
                        this.constructor.prototype[functionName] = initValue.constructor.prototype[functionName];
                    }
                });
            }
        }

        /**
         * Observe modifications on a property
         * @param {string} key      The property to observe
         * @param {mixed} initValue The initial proerpty value
         * @param {string} upperKey The key to retrieve this object from the parent object
         */
        $observe(key, initValue, upperKey) {
            if (this.$observed.has(key)) {
                return;
            }

            const handler = {
                get : () => {
                    const value = this.$object[key];

                    if (this.$root && typeof value !== 'function') {
                        if (this.$root.$executingComputed) {
                            if (!this.$callers[key]) {
                                this.$callers[key] = {};
                            }
                            // Find if this computed already registred in the observable computed
                            if (!this.$callers[key][this.$root.$executingComputed.uid]) {
                                const computed = this.$root.$executingComputed;
                                const callerObject = computed.object;

                                Object.keys(callerObject.$computed).every((computedName) => {
                                    if (callerObject.$computed[computedName] === computed) {
                                        this.$callers[key][computed.uid] = {
                                            property : computedName,
                                            reader   : computed.reader,
                                            writer   : computed.writer,
                                            object   : computed.object
                                        };

                                        return false;
                                    }

                                    return true;
                                });
                            }
                        }

                        if (this.$root.$executingDirective) {
                            if (!this.$directives[key]) {
                                this.$directives[key] = new Set([]);
                            }

                            this.$directives[key].add(this.$root.$executingDirective.uid);
                        }
                    }

                    return value;
                },

                set : (value) => {
                    let notifyParent = false;

                    if (!(key in this.$object) && !this.$root.$creatingContext) {
                        // The property is created on the object, it means the parent object has been modified
                        notifyParent = true;
                    }

                    if (typeof value === 'function' || value instanceof HTMLElement) {
                        this.$object[key] = value;

                        return true;
                    }

                    const oldValue = this.$object[key];

                    if (!isPrimitive(value) && !(value instanceof EMVObservable)) {
                        if (Array.isArray(value)) {
                            this.$object[key] = new EMVObservableArray(value, this.$root || this, this, key);
                        } else {
                            this.$object[key] = new EMVObservable(value, this.$root || this, this, key);
                        }
                    } else {
                        this.$object[key] = value;
                        if (value instanceof EMV) {
                            value.$setRoot(this.$root || this);
                            value.$parent = this;
                        }
                    }

                    if (this.$computed[key] && this.$computed[key].writer) {
                        try {
                            this.$computed[key].writer(this, value, oldValue);
                        } catch (err) {}
                    }

                    if (oldValue !== value) {
                        this.$notifySubscribers(key, value, oldValue);

                        if (notifyParent && this.$parent) {
                            this.$parent.$notifySubscribers(upperKey, this.$parent);
                        }
                    }

                    return true;
                },
                enumerable   : true,
                configurable : true
            };

            Object.defineProperty(this, key, handler);
            this.$observed.add(key);

            this[key] = initValue;
        }


        /**
         * Add a computed to the EMVObservable instance
         * @param {string} key       The variable name
         * @param {Object} options   The computed data. A function for a read-only computed,
         *                           an object with 'read' and 'write' properties for a read write computed
         * @param {boolean} autoload If set to true, the the value is calculated automatically when creating the computed
         */
        $addComputed(key, options, autoload = true) {
            this.$computed[key] = new EMVComputed(options, this);

            this.$observe(key);

            if (autoload) {
                this.$loadComputed(key);
            }
        }

        /**
         * Calculate the computed value and set it to the 'key' property
         * @param   {string} key The computed name
         */
        $loadComputed(key) {
            if (this.$computed[key].reader) {
                this[key] = this.$computed[key].reader(this);
            } else {
                this[key] = undefined;
            }
        }


        /**
         * Set the root object. This method will propagate the root to all of the sub observable elements
         * @param {EMVObservable} $root The root object to set
         */
        $setRoot($root) {
            this.$root = $root;
            Object.keys(this.$object).forEach((key) => {
                if (this.$object[key] instanceof EMVObservable) {
                    this.$object[key].$setRoot($root);
                }
            });
        }

        /**
         * Notify that a modification has been performed on a property to all of it subscribers
         * @param  {string} key      The property name that changed
         * @param  {mixed}  val      The new value of the property
         * @param  {mixed}  oldValue The previous value of the property
         */
        $notifySubscribers(key, val, oldValue) {
            if (!key) {
                return;
            }

            const value = val === undefined ? this[key] : val;

            if (this.$callers[key]) {
                Object.keys(this.$callers[key]).forEach((uid) => {
                    const caller = this.$callers[key][uid];

                    caller.object[caller.property] = caller.reader(caller.object);
                });
            }

            if (this.$watchers[key]) {
                Object.keys(this.$watchers[key]).forEach((uid) => {
                    this.$watchers[key][uid].call(this, value, oldValue);
                });
            }

            if (this.$directives[key]) {
                this.$directives[key].forEach((uid) => {
                    const directive = this.$root.$directives[uid];

                    if (!directive) {
                        this.$directives[key].delete(uid);

                        return;
                    }

                    if (directive && directive.handler.update) {
                        directive.handler.update(
                            directive.element,
                            directive.parameters,
                            directive.model
                        );
                    }
                });
            }
        }

        /**
         * Override the default valueOf method
         * @returns {Object} The object data
         */
        valueOf() {
            const result = {};

            Object.keys(this).forEach((key) => {
                result[key] = this[key] ? this[key].valueOf() : this[key];
            });

            return result;
        }

        /**
         * Override the default 'toString' method to return the JSON notation of the obejct
         * @returns {string} The JSON notation of the observable
         */
        toString() {
            return JSON.stringify(this.valueOf());
        }

        /**
         * Watch for a property value modification
         * @param  {string} prop    The property name
         * @param  {Function} handler The handler to exute when the property value changes.
         *                            This function get two paramters, newValue and oldValue
         */
        $watch(prop, handler) {
            if (Array.isArray(prop)) {
                prop.forEach((subprop) => {
                    this.$watch(subprop, handler);
                });

                return;
            }

            const propSteps = prop.split('.');
            const finalProp = propSteps.pop();
            let observable = this.$this;

            propSteps.forEach((step) => {
                observable = observable[step];
            });

            if (!observable) {
                return;
            }

            if (!observable.$watchers[finalProp]) {
                observable.$watchers[finalProp] = {};
            }

            handler.uid = guid();

            observable.$watchers[finalProp][handler.uid] = handler;
        }

        /**
         * Stop to watch on a property modifications
         * @param  {string}   prop       The property name
         * @param  {Function} handler    The handler uid to remove from watchers. If not set,
         *                               all watchers on this property are unbound
         */
        $unwatch(prop, handler) {
            const propSteps = prop.split('.');
            const finalProp = propSteps.pop();
            let observable = this.$this;

            observable = this.$this;

            propSteps.forEach((step) => {
                observable = observable[step];
            });

            if (observable.$watchers[finalProp]) {
                if (handler) {
                    delete observable.$watchers[finalProp][handler.uid];
                } else {
                    observable.$watchers[finalProp] = {};
                }
            }
        }
    }

    /**
     * This class describes the behavior of observable arrays data in EMV engine.
     */
    class EMVObservableArray extends EMVObservable {
        /**
         * Constructor
         * @param  {Object} initValue       The initial value to set on the observable
         * @param  {EMV} $root              The root EMV instance
         * @param  {EMVObservable} $parent  The parent object, containing this one
         * @param  {string} upperKey        The key to retrieve this object from the parent object
         */
        constructor(initValue, $root, $parent, upperKey) {
            super(initValue, $root, $parent, upperKey);

            this.$observe('length', initValue.length, upperKey);

            this.$watch('length', () => {
                this.forEach((item, index) => {
                    this.$observe(index, item, upperKey);
                });
            });
        }

        /**
         * Override the default valueOf method
         * @returns {Object} The object data
         */
        valueOf() {
            return Array.from(this).map((item) => {
                return item ? item.valueOf() : item;
            });
        }
    }

    // Copy the prototype functions from Array to EMVObservableArray prototype
    Object.getOwnPropertyNames(Array.prototype).forEach((key) => {
        if (!EMVObservableArray.prototype[key]) {
            EMVObservableArray.prototype[key] = Array.prototype[key];
        }
    });

    /**
     * This class describes the bahavior of EMV computed values
     */
    class EMVComputed {
        /**
         * Constructor
         * @param {Function} handler    The function that will be executed to render the property value
         * @param {Object} object       The object this computed is affected on
         */
        constructor(handler, object) {
            this.uid = guid();
            this.object = object;

            const handlers = typeof handler === 'function' ? {read : handler} : handler;

            if (handlers.write) {
                this.writer = function(target, value, oldValue) {
                    handlers.write.call(target, value, oldValue);
                };
            }

            if (handlers.read) {
                this.reader = (target) => {
                    const previousComputed = object.$root.$executingComputed;

                    object.$root.$executingComputed = this;

                    let value;

                    try {
                        value = handlers.read.call(target);
                    } catch (err) {
                        value = undefined;
                    }

                    object.$root.$executingComputed = previousComputed;

                    return value;
                };
            }
        }
    }

    /**
     * This class describes the global behavior of EMV directives
     */
    class EMVDirective {
        /**
         * Constructor
         * @param {string} name     The directive name
         * @param {Object} binder   An object containing three methods :
         *                          - init : This method is executed at EMV initialisation ,
         *                          - bind : This method is used to bind the view events throw the model
         *                          - update : This method is executed each time a variable of the model,
         *                                      which this directive depends on, is modified
         */
        constructor(name, binder) {
            this.name = name;

            const self = this;

            const computeDirectiveMethod = (method) => {
                if (binder[method]) {
                    this[method] = (element, parameters, model) => {
                        const previousDirective = model.$root.$executingDirective;

                        model.$root.$executingDirective = {
                            element    : element,
                            parameters : parameters,
                            model      : model,
                            handler    : self,
                            uid        : this.getUid(element),
                            name       : name
                        };

                        const result = binder[method](element, parameters, model);

                        model.$executingDirective = previousDirective;

                        return result;
                    };
                }
            };

            computeDirectiveMethod('init');
            computeDirectiveMethod('bind');
            computeDirectiveMethod('update');
        }


        /**
         * Get the directive uid, associated to an element
         * @param   {DOMNode} element The element the directive is associated to
         * @returns {string}          The directive uid for the given attached element
         */
        getUid(element) {
            if (!element.$uid) {
                element.$uid = guid();
            }

            return `${element.$uid}-${this.name}`;
        }
    }


    /**
     * This class describes the bevahior of an EMV instance
     */
    class EMV extends EMVObservable {
        /**
         * Constructor
         * @param {Object} param The initial data of the EMV
         * @param {EMV} $root The root EMV element containing this one
         */
        constructor(param, $root) {
            const options = param || {};

            super(options.data || options, $root);

            Object.defineProperties(this, {
                // Manage the templates
                $templates : {
                    value : {}
                },
                // Manage the executing computed
                $executingComputed : {
                    writable : true,
                    value    : null
                },
                // Manage the executing directive
                $executingDirective : {
                    writable : true,
                    value    : null
                },
                // Manage if a context is creating
                $creatingContext : {
                    writable : true,
                    value    : false
                }
            });

            if (options.computed) {
                Object.keys(options.computed).forEach((key) => {
                    this.$addComputed(key, options.computed[key], false);
                });
            }

            Object.keys(this.$computed).forEach((key) => {
                this.$loadComputed(key);
            });
        }


        /**
         * Apply the instance on a DOM node
         * @param  {DOMNode} element The node to apply the EMV instance on
         */
        $apply(element) {
            if (this.$rootElement) {
                throw new EMVError('an emv instance cannot be instanciated on multiple DOM elements.');
            }

            this.$rootElement = element || document.body;

            this.$createContext(this.$rootElement, this);

            this.$parse(this.$rootElement);

            this.$render(this.$rootElement);
        }


        /**
         * Clean a node of all directives
         * @param {DOMNode} element The element to clean
         * @param {Array} excludes  The directives to not clean
         */
        $clean(element, excludes) {
            const elem = element || this.$rootElement;

            if (!elem) {
                return;
            }

            if (elem.$directives) {
                Object.keys(elem.$directives).forEach((directive) => {
                    if (!excludes || excludes.indexOf(directive) === -1) {
                        const uid = elem.$directives[directive];

                        delete this.$directives[uid];
                        delete elem.$directives[directive];
                    }
                });
            }

            if (elem.children) {
                Array.from(elem.children).forEach((child) => {
                    this.$clean(child);
                });
            }

            if (elem === this.$rootElement) {
                delete this.$rootElement;
            }
        }

        /**
         * Register a new template
         * @param {string} name The template name
         * @param {string} html The template content
         */
        $registerTemplate(name, html) {
            // Remove comment from template to be compatible with jquery
            const parsedHtml = html.replace(/<!--(.*?)-->/g, '');

            this.$templates[name] = parsedHtml;
        }


        /**
         * Parse a transformation, to get the name and the parameters of the transformation
         * @param   {string} transformation The transformation expression to parse
         * @returns {Object}                The parse transformation, with the keys 'name', and 'parameters'
         */
        $parseDirectiveTransformation(transformation) {
            const match = (/^(\w+)(\((.+)\))?$/).exec(transformation);

            if (match) {
                const name = match[1];
                const param = `{${match[3] || ''}}`;

                return {
                    name       : name,
                    parameters : param
                };
            }

            throw new Error();
        }

        /**
         * Parse a handlebars directive
         * @param   {DOMNode} element The element to parse
         * @param   {string}  value   The string to parse
         * @returns {string}          The parsed handlebars directive
         */
        $parseHandlebardDirective(element, value) {
            const safeStringRegex = new RegExp(
                `${escapeRegExp(EMV.config.delimiters[0])}(.+?)${escapeRegExp(EMV.config.delimiters[1])}`,
                'g'
            );

            const match = value.match(safeStringRegex);

            if (match) {
                this.$getContext(element.parentNode);

                const parameters = value.replace(safeStringRegex, (match, expression) => {
                    const steps = expression.split('::').map((step) => {
                        return step.trim();
                    });

                    let result = steps[0];

                    if (steps.length > 1) {
                        steps.slice(1).forEach((transformation) => {
                            try {
                                const transform = this.$parseDirectiveTransformation(transformation);

                                result = `$root.constructor.transformations.${transform.name}(${result}, ${transform.parameters})`;
                            } catch (err) {
                                throw new EMVError(`Error while parsing directive transformation : ${value}`);
                            }
                        });
                    }

                    return `' + ${result} + '`;
                });

                return parameters;
            }

            return null;
        }


        /**
         * Parse the directives on the element and init them
         * @param   {DOMNode} element  The element to parse
         * @param   {Array} excludes The directives to no parse on the element
         */
        $parse(element, excludes) {
            if (element.$directives) {
                return;
            }

            if (element.nodeName.toLowerCase() === 'template') {
                // Parse templates
                this.$registerTemplate(element.id, element.innerHTML);
                element.parentNode.removeChild(element);
            } else if (element.nodeName.toLowerCase() === '#text') {
                // Parse raw directives in texts
                const parameters = this.$parseHandlebardDirective(element, element.textContent);

                if (parameters !== null) {
                    this.$setElementDirective(element, 'text', `'${parameters}'`);
                }
            } else if (element.attributes) {
                // Parse attributes directives
                Object.keys(EMV.directives).forEach((name) => {
                    if ((!excludes || excludes.indexOf(name) === -1) && element.getAttribute) {
                        const attribute = `${EMV.config.attributePrefix}-${name}`;

                        if (element.hasAttribute(attribute)) {
                            const parameters = element.getAttribute(attribute);
                            const directive = EMV.directives[name];

                            this.$getContext(element);
                            this.$setElementDirective(element, name, parameters);

                            if (directive.init) {
                                directive.init.call(this, element, parameters, this);
                            }
                        }
                    }
                });

                // Parse raw directives in attributes
                Array.from(element.attributes).forEach((attribute) => {
                    const attributeName = attribute.name;
                    const value = attribute.textContent;

                    const attrValue = this.$parseHandlebardDirective(element, value);

                    if (attrValue !== null) {
                        const attrDirective = this.$directives[element.$directives && element.$directives.attr];
                        let parameters = attrDirective && attrDirective.parameters || '';

                        if (parameters) {
                            parameters = `${parameters.substring(1, parameters.length - 1)},`;
                        }

                        parameters += `'${attributeName}' : '${attrValue}'`;

                        parameters = `{${parameters}}`;

                        this.$setElementDirective(element, 'attr', parameters);
                    }
                });
            }

            if (element.childNodes) {
                Array.from(element.childNodes).forEach((child) => {
                    this.$parse(child);
                });
            }
        }

        /**
         * Set a directive on an element
         * @param {DOMNode} element   The element to set a directive on
         * @param {string} name       The directive name
         * @param {string} parameters The directive parameters
         */
        $setElementDirective(element, name, parameters) {
            if (!element.$directives) {
                element.$directives = {};
            }

            if (!element.$uid) {
                element.$uid = guid();
            }

            const directive = EMV.directives[name];
            const uid = directive.getUid(element);

            this.$directives[uid] = {
                name       : name,
                handler    : directive,
                parameters : parameters,
                model      : this,
                element    : element
            };

            element.$directives[name] = uid;
        }

        /**
         * Render a node and all it descendants with declared directives
         * @param  {DOMNode} element The node to render
         * @param {Array} excludes The directives to not render on the element
         */
        $render(element, excludes) {
            element.$stopRenderingPropagation = false;

            // Variable to stop to render
            if (element.$directives) {
                Object.keys(element.$directives).forEach((name) => {
                    if ((!excludes || excludes.indexOf(name) === -1) && !element.$stopRenderingPropagation) {
                        const uid = element.$directives[name];
                        const directive = this.$directives[uid];

                        if (!directive) {
                            return;
                        }

                        const handler = directive.handler;
                        const parameters = directive.parameters;

                        if (handler.bind) {
                            handler.bind.call(this, element, parameters, this);
                        }

                        if (handler.update) {
                            handler.update.call(this, element, parameters, this);
                        }
                    }
                });
            }

            if (!document.documentElement.contains(element)) {
                return;
            }

            if (!element.$stopRenderingPropagation && element.childNodes) {
                Array.from(element.childNodes).forEach((child) => {
                    this.$render(child);
                });
            }
        }

        /**
         * Avoid the render engine to propagate the renderign in element child nodes
         * @param  {DOMNode} element The element
         */
        $stopRenderingPropagation(element) {
            element.$stopRenderingPropagation = true;
        }


        /**
         * Create a context, attached to a DOM node
         * @param  {DOMNode} element       THe node to create a context on
         * @param  {Object} object      The object to insert in the context
         * @param  {Object} otherParams Other parameters to insert in the context
         */
        $createContext(element, object, otherParams) {
            this.$creatingContext = true;

            let context = object;

            if (object instanceof EMVObservable) {
                // context = object;
                context.$this = object;
                context.$parent = object.$parent;
                context.$root = this;
            } else {
                context = {
                    $this                 : object,
                    $parent               : object.$parent,
                    $root                 : this,
                    $additionalProperties : new Set([])
                };
            }

            const additionalProperties = this.$getAdditionalContextProperties(element);

            additionalProperties.forEach((key) => {
                if (['$this', '$parent', '$root'].indexOf(key) !== -1) {
                    throw new EMVError(`You cannot apply the key '${key}' as additionnal context property`);
                }

                context.$additionalProperties.add(key);
                Object.defineProperty(context, key, {
                    value    : (element.parentNode || element.$parent).$context[key],
                    writable : true
                });
            });

            element.$additionalContextProperties = new Set(additionalProperties);

            if (otherParams) {
                Object.keys(otherParams).forEach((key) => {
                    context.$additionalProperties.add(key);

                    Object.defineProperty(context, key, {
                        value    : otherParams[key],
                        writable : true
                    });

                    element.$additionalContextProperties.add(key);
                });
            }

            element.$context = context;

            this.$creatingContext = false;
        }

        /**
         * Remove the context of an element
         * @param  {DOMNode} element The element to remove the context of
         */
        $removeContext(element) {
            delete element.$context;

            if (element.children) {
                Array.from(element.children).forEach((child) => {
                    this.$removeContext(child);
                });
            }
        }

        /**
         * Get the contect of a given DOM node
         * @param   {DOMNode} element The node to get the context o
         * @returns {Object}       The DOM node context
         */
        $getContext(element) {
            if (!element) {
                return {};
            }

            if (element.$context) {
                return element.$context;
            }

            const context = this.$getContext(element.parentNode);

            element.$context = context;

            return context;
        }


        /**
         * Get the contect of a given DOM node
         * @param   {DOMNode} element The node to get the context o
         * @returns {Object}       The DOM node context
         */
        $getAdditionalContextProperties(element) {
            if (element.$additionalContextProperties) {
                return element.$additionalContextProperties;
            }

            if (element === this.$rootElement) {
                return new Set([]);
            }

            const parent = element.parentNode || element.$parent;

            if (parent) {
                const additionalContextProperties = this.$getAdditionalContextProperties(parent);

                element.$additionalContextProperties = additionalContextProperties;

                return additionalContextProperties;
            }

            return new Set([]);
        }

        /**
         * This method parses parameters in a directive
         * @param   {string} parameters The node attribute value, corresponding the directive attributes
         * @returns {Function}          The parsed function
         */
        $parseDirectiveGetterParameters(parameters) {
            return new Function('$context', `var $$result;with($context) {$$result=(${parameters});};return $$result;`);
        }

        /**
         * Get the value of a directive parameters
         * @param {string} parameters The directive parameters
         * @param {Object} element    The element the directive is applied on
         * @param {Object} context    Force to use this context
         * @returns {mixed}           The calculated value
         */
        $getDirectiveValue(parameters, element, context) {
            const expression = parameters.replace(/\n\s*/g, '');
            const getter = this.$parseDirectiveGetterParameters(expression);
            const realContext = context || this.$getContext(element);

            try {
                const data = getter(realContext);

                if (typeof data === 'object' && data.$transform && '$data' in data) {
                    if (!Array.isArray(data.$transform)) {
                        data.$transform = [data.$transform];
                    }

                    let value = data.$data;

                    data.$transform.forEach((transformation) => {
                        const transform = this.$parseDirectiveTransformation(transformation);
                        const param = new Function('', `return ${transform.parameters};`);

                        value = EMV.transformations[transform.name](value, param());
                    });

                    return value;
                }

                return data;
            } catch (err) {
                return undefined;
            }
        }

        /**
         * This method parses parameters in a directive
         * @param   {string} parameters The node attribute value, corresponding the directive attributes
         * @returns {Function}          The parsed function
         */
        $parseDirectiveSetterParameters(parameters) {
            let variable = parameters;
            const match = parameters.match(/\$(?:data|set)\s*:\s*(.+?)\s*[,}]/);

            if (match) {
                variable = match[1];
            }

            return new Function('$context', '$value', `
                with($context) {
                    ${variable} = $value;
                }
            `);
        }


        /**
         * Set the value on the property defined by the directive parameters
         * @param {string}  parameters The directive parameters
         * @param {DOMNode} element    The element the directive is applied on
         * @param {mixed}   value      The value to set
         */
        $setDirectiveValue(parameters, element, value) {
            const setter = this.$parseDirectiveSetterParameters(parameters);

            try {
                setter(this.$getContext(element), value);
            } catch (err) {
                throw new EMVError(err.message);
            }
        }


        /**
         * Create a directive for EMV
         * @param {string} name   The directive name
         * @param {Object} binder The directive description. This object contains two methods bind and update
         */
        static directive(name, binder) {
            this.directives[name] = new EMVDirective(name, binder);
        }

        /**
         * Create a filetr for EMV
         * @param   {string}   name   The filter name
         * @param   {Function} filter The filter method. This functions takes only the value to transform as parameter
         */
        static transform(name, filter) {
            this.transformations[name] = filter;
        }

        /**
         * Insert or remove an element from it parent element
         * @param {DOMNode} element     The element to insert or remove form the DOM
         * @param {boolean} value       Defines if the element must be created (true) or removed (false)
         * @param {DOMNode} baseon      The element the one to insert / remove is based on
         * @param {bool}    force       If set to true, and value is set to true,
         *                              then even if the node already exists, it will be inserted
         */
        $insertRemoveElement(element, value, baseon, force) {
            const baseElement = baseon || element;

            if (value) {
                const createElement = !baseElement.$parent.contains(element) || force;

                if (createElement) {
                    // Insert the node
                    let before = null;

                    if (element.$before) {
                        element.$before.every((node) => {
                            if (baseElement.$parent.contains(node)) {
                                before = node;

                                return false;
                            }

                            return true;
                        });
                    }

                    if (before) {
                        if (before.nextElementSibling) {
                            baseElement.$parent.insertBefore(element, before.nextElementSibling);
                        } else {
                            baseElement.$parent.appendChild(element);
                        }
                    } else {
                        baseElement.$parent.insertBefore(element, baseElement.$parent.firstChild);
                    }
                }
            } else {
                this.$stopRenderingPropagation(element);

                // remove the node
                if (baseElement.$parent.contains(element)) {
                    baseElement.$parent.removeChild(element);
                }
            }
        }
    }

    /**
     * The EMV ciretives
     * @type {Object}
     */
    EMV.directives = {};

    /**
     * Element attributes directives
     */

    // Show / hide an element
    EMV.directive('show', {
        update : function(element, parameters, model) {
            const value = model.$getDirectiveValue(parameters, element);

            if (value) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        }
    });


    EMV.directive('class', {
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            if (!element.originalClassList) {
                element.originalClassList = [];
                Array.from(element.classList).forEach((classname) => {
                    element.originalClassList.push(classname);
                });
            }

            // Reset the element to it original class list before applying calculated classes
            Array.from(element.classList).forEach((classname) => {
                if (element.originalClassList.indexOf(classname) === -1) {
                    element.classList.remove(classname);
                }
            });

            if (!value) {
                return;
            }

            if (typeof value === 'string') {
                value = {
                    [value] : true
                };
            }

            if (typeof value === 'object') {
                Object.keys(value).forEach((classname) => {
                    const classes = classname.split(' ');
                    const classList = element.classList;

                    classes.forEach((cl) => {
                        if (value[classname]) {
                            classList.add(cl);
                        } else {
                            classList.remove(cl);
                        }
                    });
                });
            }
        }
    });

    EMV.directive('style', {
        update : function(element, parameters, model) {
            const styles = model.$getDirectiveValue(parameters, element);

            if (!styles || typeof styles !== 'object') {
                return;
            }

            Object.keys(styles).forEach((attr) => {
                const value = styles[attr];

                if (!value) {
                    element.style[attr] = '';
                } else {
                    element.style[attr] = value;
                }
            });
        }
    });

    EMV.directive('attr', {
        update : function(element, parameters, model) {
            const attributes = model.$getDirectiveValue(parameters, element);

            if (!attributes || typeof attributes !== 'object') {
                return;
            }

            Object.keys(attributes).forEach((attr) => {
                const value = attributes[attr];

                if (!value) {
                    element.removeAttribute(attr);
                } else {
                    element.setAttribute(attr, value);
                }
            });
        }
    });

    EMV.directive('disabled', {
        update : function(element, parameters, model) {
            const value = model.$getDirectiveValue(parameters, element);

            if (!value) {
                element.removeAttribute('disabled');
            } else {
                element.setAttribute('disabled', true);
            }
        }
    });

    /**
     * Form control directives
     */
    EMV.directive('value', {
        bind : function(element, parameters, model) {
            element[element.contentEditable === 'true' ? 'onblur' : 'onchange'] = function() {
                let value;

                const nodeName = element.nodeName.toLowerCase();
                const type = element.type;

                switch (nodeName) {
                    case 'input' :
                    case 'select' :
                        switch (type) {
                            case 'checkbox' :
                                value = Boolean(element.checked);
                                break;

                            case 'radio' :
                                value = document.querySelector(`input[name="${element.name}"]:checked`).value;
                                break;

                            case 'number' :
                                value = parseFloat(element.value);
                                if (isNaN(value)) {
                                    value = element.value;
                                }
                                break;

                            case 'date' :
                                value = element.value ? new Date(element.value) : null;
                                break;

                            default :
                                value = element.value;
                                break;
                        }
                        break;

                    case 'textarea' :
                        value = element.value;
                        break;

                    default :
                        if (element.contentEditable) {
                            value = element.innerHTML;

                            break;
                        }

                        return;
                }

                model.$setDirectiveValue(parameters, element, value);
            };
        },
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            if (value === undefined) {
                value = '';
            }

            const nodeName = element.nodeName.toLowerCase();
            const type = element.type;

            switch (nodeName) {
                case 'input' :
                case 'select' :
                    switch (type) {
                        case 'checkbox' :
                            element.checked = Boolean(value);
                            break;

                        case 'radio' : {
                            const radio = document.querySelector(`input[name="${element.name}"][value="${value}"]`);

                            if (radio) {
                                radio.checked = true;
                            }
                            break;
                        }

                        case 'date' : {
                            if (!(value instanceof Date)) {
                                value = new Date(value);
                            }

                            const year = value.getFullYear();
                            const month = (value.getMonth() + 1).toString().padStart(2, '0');
                            const date = value.getDate().toString()
                            .padStart(2, '0');

                            element.value = `${year}-${month}-${date}`;
                            break;
                        }

                        case 'file' :
                            return;

                        default :
                            element.value = value;
                            break;
                    }
                    break;

                case 'textarea' :
                    element.value = value;
                    break;

                default :
                    if (element.contentEditable) {
                        element.innerHTML = value;
                    } else {
                        element.value = value;
                    }
                    break;
            }
        }
    });

    EMV.directive('input', {
        bind : function(element, parameters, model) {
            element.addEventListener('input', () => {
                model.$setDirectiveValue(parameters, element, element.value);
            });
        },
        update : function(element, parameters, model) {
            const value = model.$getDirectiveValue(parameters, element);
            const start = element.selectionStart;
            const end = element.selectionEnd;

            element.value = value || '';

            if (element.type === 'text') {
                element.setSelectionRange(start, end);
            }
        }
    });

    EMV.directive('focus', {
        bind : function(element, parameters, model) {
            element.addEventListener('focus', () => {
                try {
                    model.$setDirectiveValue(parameters, element, true);
                } catch (err) {}
            });

            element.addEventListener('blur', () => {
                try {
                    model.$setDirectiveValue(parameters, element, false);
                } catch (err) {}
            });
        },
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            if (typeof value === 'object' && '$get' in value) {
                value = value.$get;
            }

            if (value && element !== document.activeElement) {
                element.focus();
            } else if (!value && element === document.activeElement) {
                element.blur();
            }
        }
    });

    EMV.directive('options', {
        update : function(element, parameters, model) {
            if (element.nodeName.toLowerCase() !== 'select') {
                throw new EMVError('options directive can be applied only on select tags');
            }

            const value = model.$getDirectiveValue(parameters, element);
            let options = value.valueOf();

            if (!value) {
                return;
            }

            if ('$data' in value && !value.$data) {
                return;
            }

            if (value.$data) {
                options = {};
                const $data = value.$data.valueOf();

                Object.keys($data).forEach((key) => {
                    const line = value.$data[key];
                    const optionValue = value.$value ? line[value.$value] : key;
                    const optionLabel = value.$label ? line[value.$label] : line;

                    options[optionValue] = optionLabel;
                });
            }

            // Reset the select
            const currentValue = element.value || value.$selected;

            element.innerHTML = '';

            /**
             * Insert the options tags
             * @param   {string} value The option value
             * @param   {string} label The option label
             */
            function insertOptionTag(value, label) {
                const optionTag = document.createElement('option');

                optionTag.value = value;
                optionTag.innerText = label;
                if (value.toString() === currentValue) {
                    optionTag.selected = true;
                }

                element.appendChild(optionTag);
            }

            Object.keys(options).forEach((value) => {
                const label = options[value];

                insertOptionTag(value, label);
            });
        }
    });


    /**
     * Content directives
     */
    EMV.directive('text', {
        update : function(element, parameters, model) {
            const value = model.$getDirectiveValue(parameters, element);

            if (element.nodeName === '#text') {
                element.nodeValue = value;
            } else {
                element.innerText = value;
            }
        }
    });

    EMV.directive('html', {
        update : function(element, parameters, model) {
            const html = model.$getDirectiveValue(parameters, element);

            element.innerHTML = html;

            const scripts = element.querySelectorAll('script');

            Array.from(scripts).forEach((script) => {
                if (script.innerText) {
                    const func = new Function(script.innerText);

                    func();
                } else {
                    const node = document.createElement('script');

                    node.src = script.src;

                    script.parentNode.replaceChild(node, script);
                }
            });
        }
    });


    /**
     * Events directives
     */
    EMV.directive('click', {
        bind : function(element, parameters, model) {
            const action = model.$parseDirectiveGetterParameters(parameters);

            element.onclick = function(event) {
                const ctx = model.$getContext(element);
                const result = action(ctx, event);

                if (typeof result === 'function') {
                    result.call(ctx.$this, ctx, event);
                }
            };
        }
    });

    EMV.directive('on', {
        bind : function(element, parameters, model) {
            const parser = model.$parseDirectiveGetterParameters(parameters);
            const events = parser(model.$getContext(element));


            if (typeof events !== 'object') {
                return;
            }

            Object.keys(events).forEach((event) => {
                const action = events[event];
                const listener = `on${event}`;

                element[listener] = function(event) {
                    action(model.$getContext(element), event);
                };
            });
        }
    });

    EMV.directive('submit', {
        bind : function(element, parameters, model) {
            if (element.nodeName.toLowerCase() !== 'form') {
                throw new EMVError('submit directive can be applied only on form tags');
            }
            const action = model.$parseDirectiveGetterParameters(parameters);

            element.addEventListener('submit', (event) => {
                event.preventDefault();

                const result = action(model.$getContext(element));

                if (typeof result === 'function') {
                    result(model.$getContext(element), event);
                }
            });
        }
    });


    /**
     * Dom maniuplation directives
     */

    /**
     * Initialize the properties of an element
     * @param {DOMNode} element The element to initialize
     * @param {EMV}     model   The model
     */
    function initElementProperties(element, model) {
        element.$before = [];

        if (element.previousElementSibling) {
            element.$before = [element.previousElementSibling];

            if (element.previousElementSibling.$before) {
                element.$before = element.$before.concat(element.previousElementSibling.$before);
            }
        }

        element.$parent = element.parentNode;

        const template = element.innerHTML;
        const templateName = guid();

        element.$templateName = templateName;

        model.$registerTemplate(templateName, template);
    }


    EMV.directive('each', {
        init : function(element, parameters, model) {
            initElementProperties(element, model);

            element.$clones = [];

            const meta = document.createElement('meta');

            meta.$initialElement = element;
            meta.$uid = element.$uid;
            meta.$context = element.$context;
            meta.setAttribute('name', `e-each-${element.$uid}`);

            model.$setElementDirective(meta, 'each', parameters);

            element.parentNode.replaceChild(meta, element);
        },

        update : function(meta, parameters, model) {
            const element = meta.$initialElement;
            const param = model.$getDirectiveValue(parameters, element);
            let isObject = false;

            if (!param) {
                // The directive parameters render an empty value, quit the directive
                return;
            }

            let list = param.$data || param;

            if (isPrimitive(list)) {
                return;
            }

            if (Array.isArray(list)) {
                // The input is an array
                // Filter the list
                list = list.filter((item) => {
                    if (item === undefined || item === null) {
                        return false;
                    }

                    if (param.$filter && !param.$filter(item)) {
                        return false;
                    }

                    return true;
                });
            } else {
                isObject = true;
                const values = Object.keys(list)

                .filter((key) => {
                    const item = list[key];

                    if (item === undefined || item === null) {
                        return false;
                    }

                    if (param.$filter && !param.$filter(item)) {
                        return false;
                    }

                    return true;
                })
                .map((key) => {
                    list[key].$key = key;

                    return list[key];
                });

                list = values;
            }

            // Order the list
            if (param.$sort) {
                if (typeof param.$sort === 'function') {
                    list.sort(param.$sort);
                } else {
                    list.sort((item1, item2) => {
                        return item1[param.$sort] < item2[param.$sort] ? -1 : 1;
                    });
                }
            }

            if (param.$order && param.$order < 0) {
                list.reverse();
            }

            const offset = param.$offset || 0;
            const end = offset + (param.$limit || list.length);

            list = list.slice(offset, end);

            // Remove the nodes that are not present anymore in the list
            const clones = element.$clones.slice();

            clones.forEach((clone) => {
                if (list.indexOf(clone.$$item) === -1 || !clone.$context) {
                    model.$clean(clone);
                    if (clone.parentNode && clone.parentNode.contains(clone)) {
                        clone.parentNode.removeChild(clone);
                    }
                }
            });
            element.$clones = [];

            // Add new items and move the one that need to be moved
            list.forEach((item, index) => {
                const itemPreviousIndex = clones.findIndex((clone) => {
                    return clone.$$item === item;
                });

                const before = element.$clones.slice()
                .reverse()
                .concat(meta)
                .concat(element.$before);

                if (itemPreviousIndex !== -1) {
                    // The item already exists
                    const existingClone = clones[itemPreviousIndex];

                    element.$clones.push(existingClone);

                    if (itemPreviousIndex === index) {
                        // Nothing to do
                        return;
                    }

                    // The item exists but is not at the right place
                    existingClone.$before = before;
                    existingClone.$context.$index = index;
                    model.$insertRemoveElement(existingClone, true, element, true);

                    return;
                }


                // The item does not exist, create it
                const additionalProperties = {
                    $index : isObject ? item.$key : index
                };

                if (param.$item) {
                    additionalProperties[param.$item] = item;
                }

                const clone = element.cloneNode(true);

                clone.$$item = item;

                // Create the sub context for the item
                clone.$parent = element.$parent;
                model.$createContext(clone, item, additionalProperties);

                // Set the elements before the clone
                clone.$before = before;
                // Copy the base element directives on the clone, except 'each', to avoid infinite loop
                Object.keys(element.$directives).forEach((name) => {
                    if (name !== 'each') {
                        const uid = element.$directives[name];

                        model.$setElementDirective(clone, name, model.$directives[uid].parameters);
                    }
                });

                // Insert the clone
                model.$insertRemoveElement(clone, true, element);

                clone.innerHTML = model.$templates[element.$templateName];

                if (clone.childNodes) {
                    Array.from(clone.childNodes).forEach((child) => {
                        model.$parse(child);
                    });
                }

                model.$render(clone, ['each']);

                // Add the clone to the list of the element clones
                element.$clones.push(clone);
            });
        }
    });

    EMV.directive('if', {
        init : function(element, parameters, model) {
            initElementProperties(element, model);
        },

        update : function(element, parameters, model) {
            const value = Boolean(model.$getDirectiveValue(parameters, element));

            model.$insertRemoveElement(element, value);

            if (value) {
                model.$render(element, ['if']);
            }
        }
    });

    EMV.directive('unless', {
        init : function(element, parameters, model) {
            initElementProperties(element, model);
        },

        update : function(element, parameters, model) {
            const value = model.$getDirectiveValue(parameters, element);

            model.$insertRemoveElement(element, !value);

            if (!value) {
                model.$render(element, ['unless']);
            }
        }
    });

    EMV.directive('with', {
        init : function(element, parameters, model) {
            initElementProperties(element, model);
        },
        update : function(element, parameters, model) {
            let context;
            const additionalProperties = {};

            if (element === model.$rootElement) {
                context = model.$getDirectiveValue(parameters, element, model);
            } else if (element.$parent) {
                model.$removeContext(element);
                context = model.$getDirectiveValue(parameters, element.$parent);
            } else {
                model.$stopRenderingPropagation(element);

                return;
            }

            if (context && '$data' in context) {
                if ('$as' in context) {
                    additionalProperties[context.$as] = context.$data;
                }

                context = context.$data;
            }


            if (context) {
                // Remove the previous context
                model.$removeContext(element);

                // Create the new context
                model.$createContext(element, context, additionalProperties);

                model.$insertRemoveElement(element, true);

                if (element.childNodes) {
                    Array.from(element.childNodes).forEach((child) => {
                        model.$clean(child);
                    });
                }

                element.innerHTML = model.$templates[element.$templateName];

                if (element.childNodes) {
                    Array.from(element.childNodes).forEach((child) => {
                        model.$parse(child);
                    });
                }

                model.$render(element, ['with']);
            } else {
                model.$insertRemoveElement(element, false);
            }
        }
    });

    EMV.directive('template', {
        update : function(element, parameters, model) {
            if (!document.documentElement.contains(element)) {
                return;
            }

            const templateName = model.$getDirectiveValue(parameters, element);

            const template = model.$templates[templateName] || '';

            // Insert the template
            element.innerHTML = template;

            const scripts = element.querySelectorAll('script');

            Array.from(scripts).forEach((script) => {
                if (script.innerText) {
                    const func = new Function(script.innerText);

                    func();
                } else {
                    const node = document.createElement('script');

                    node.src = script.src;

                    script.parentNode.replaceChild(node, script);
                }
            });

            // Parse and render the content
            if (element.childNodes) {
                Array.from(element.childNodes).forEach((child) => {
                    model.$parse(child);
                });

                Array.from(element.childNodes).forEach((child) => {
                    model.$render(child);
                });
            }
        }
    });


    /**
     * The EMV filters
     */
    EMV.transformations = {};

    // Uppercase filter
    EMV.transform('upper', (value) => {
        return typeof value === 'string' && value.toUpperCase() || value;
    });

    // Lowercase filter
    EMV.transform('lower', (value) => {
        return typeof value === 'string' && value.toLowerCase() || value;
    });

    // Put the first character upper case, then the following lowercases
    EMV.transform('ucfirst', (value) => {
        if (typeof value !== 'string') {
            return value;
        }

        return value.substr(0, 1).toUpperCase() + value.substr(1);
    });


    // Put each word with a capital first letter
    EMV.transform('ucwords', (value) => {
        if (typeof value !== 'string') {
            return value;
        }

        return value.replace(/(^|\s)(.)/g, (match, sep, char) => {
            return sep + char.toUpperCase();
        });
    });

    // Write the object as JSON
    EMV.transform('json', (value) => {
        return JSON.stringify(value.valueOf());
    });

    // Format a number
    EMV.transform('number', (value, parameters) => {
        if (typeof value !== 'number') {
            return value;
        }

        let result = value;

        if (parameters.decimals !== undefined) {
            result = result.toFixed(parameters.decimals);
        }

        if (parameters.thousandSep) {
            result = result.replace(/\B(?=(?:\d{3})+(?!\d))/g, parameters.thousandSep);
        }

        if (parameters.decimalSep) {
            result = result.replace('.', parameters.decimalSep);
        }

        return result;
    });

    // Define the default EMV configuration
    EMV.config = {
        attributePrefix : 'e',
        delimiters      : ['${', '}']
    };

    // Define the version
    Object.defineProperty(EMV, 'version', {
        value    : '{{ version }}',
        writable : false
    });

    // Utils
    EMV.utils = {
        uid : function() {
            return guid();
        }
    };

    // Overwrite Array.isArray function to make EMVObservableArray to return true
    const originalIsArray = Array.isArray;

    Array.isArray = function(variable) {
        if (variable instanceof EMVObservableArray) {
            return true;
        }

        return originalIsArray(variable);
    };

    return EMV;
});
