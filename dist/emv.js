/*global define, module, exports*/
/* eslint no-invalid-this:0 */

/**
 * emv.js v1.0.1
 *
 * @author Elvyrra S.A.S
 * @license http://rem.mit-license.org/ MIT
 */
'use strict';

(function(global, factory) {
    if(typeof exports === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    }
    else if (typeof define === 'function' && define.amd) {
        define(factory);
    }
    else {
        global.EMV = factory();
    }
})(this, function() {
    let executingComputed = null,
        executingDirective = null,
        creatingContext = false;

    const reservedWords = [
        'break',
        'case',
        'catch',
        'continue',
        'debugger',
        'default',
        'delete',
        'do',
        'else',
        'finally',
        'for',
        'if',
        'in',
        'instanceof',
        'new',
        'return',
        'switch',
        'throw',
        'try',
        'typeof',
        'var',
        'void',
        'while',
        'with',
        'class',
        'enum',
        'export',
        'extends',
        'import',
        'super',
        'implements',
        'interface',
        'let',
        'package',
        'private',
        'protected',
        'public',
        'static',
        'yield'
    ];

    const reservedWordsRegex = new RegExp(`\\b(${reservedWords.join('|')})\\b`, 'g');

    /**
     * Generate a unique id
     * @returns {[type]} [description]
     */
    function guid() {
        const s4 = () => {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        };

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    /**
     * Detect if a value is a primitive value
     *
     * @param {mixed} variable The varname to test
     * @returns {boolean} True if the variable is primitive
     */
    function isPrimitive(variable) {
        let types = [
            'string',
            'number',
            'boolean',
            'undefined',
            'symbol'
        ];

        return types.indexOf(typeof variable) !== -1 || variable === null;
    }

    /**
     * Escape the special chars of a regular expression
     * @param   {string} str The string to escape
     * @returns {string}     The escaped string
     */
    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
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
            let fullMessage = `EMV Error : ${message}`;

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
            this.$callers = {};
            this.$directives = {};
            this.$watchers = {};
            this.$root = $root || this;
            this.$parent = $parent;
            this.$computed = {};
            this.$this = this;

            let proxyHandler = {
                get : function(object, key) {
                    if(typeof key !== 'string') {
                        return object[key];
                    }

                    let value = object[key];

                    if(key.substr(0, 1) === '$') {
                        return this[key];
                    }

                    if(this.$root && typeof value !== 'function') {
                        if(executingComputed) {
                            if(!this.$callers[key]) {
                                this.$callers[key] = {};
                            }
                            // Find if this computed already registred in the observable computed
                            if(!this.$callers[key][executingComputed.uid]) {
                                Object.keys(this.$root.$computed).every(function(computedName) {
                                    if(this.$root.$computed[computedName] === executingComputed) {
                                        this.$callers[key][executingComputed.uid] = {
                                            property : computedName,
                                            reader : executingComputed.reader,
                                            writer : executingComputed.writer,
                                            object : executingComputed.object
                                        };

                                        return false;
                                    }

                                    return true;
                                }.bind(this));
                            }
                        }

                        if(executingDirective) {
                            if(!this.$directives[key]) {
                                this.$directives[key] = {};
                            }

                            if(!this.$directives[key][executingDirective.uid]) {
                                this.$directives[key][executingDirective.uid] = executingDirective;
                            }
                        }
                    }

                    return value;
                }.bind(this),

                set : function(object, key, value) {
                    if(typeof key !== 'string') {
                        return true;
                    }


                    let notifyParent = false;
                    let internalKey = key.substr(0, 1) === '$';

                    if(!(key in object) && !creatingContext) {
                        // The property is created on the object, it means the parent object has been modified
                        notifyParent = true;
                    }

                    if(internalKey || typeof value === 'function') {
                        object[key] = value;

                        return true;
                    }

                    let oldValue = object[key];

                    if(!isPrimitive(value) && !(value instanceof EMVObservable)) {
                        if(Array.isArray(value)) {
                            object[key] = new EMVObservableArray(value, this.$root || object, object, key);
                        }
                        else {
                            object[key] = new EMVObservable(value, this.$root || object, object, key);
                        }
                    }
                    else {
                        object[key] = value;
                        if(value instanceof EMV) {
                            value.$root = this.$root || object;
                            value.$parent = object;
                        }
                    }

                    if(this.$computed[key] && this.$computed[key].writer) {
                        try {
                            this.$computed[key].writer(this, value, oldValue);
                        }
                        catch(err) {}
                    }
                    if(oldValue !== value) {
                        this.$notifySubscribers(key, value, oldValue);

                        if(notifyParent && this.$parent) {
                            this.$parent.$notifySubscribers(upperKey, this.$parent);
                        }
                    }

                    return true;
                }.bind(this),

                deleteProperty : function(object, key) {
                    if(typeof key !== 'string') {
                        return true;
                    }

                    let internalKey = key.substr(0, 1) === '$';

                    let oldValue = object[key];

                    delete object[key];

                    if(!internalKey) {
                        this.$notifySubscribers(key, undefined, oldValue);

                        if(this.$parent) {
                            this.$parent.$notifySubscribers(upperKey, this.$parent);
                        }
                    }

                    return true;
                }.bind(this),

                ownKeys : function(object) {
                    return Object.getOwnPropertyNames(object).filter(function(varname) {
                        return varname.substr(0, 1) !== '$' &&
                                (!this instanceof EMVObservableArray || varname !== 'length');
                    });
                }
            };

            let proxy = new Proxy(this, proxyHandler);

            Object.keys(initValue).forEach(function(key) {
                proxy[key] = initValue[key];
            });

            return proxy;
        }


        /**
         * Notify that a modification has been performed on a property to all of it subscribers
         * @param  {string} key     The property name that changed
         * @param  {mixed} value    The new value of the property
         * @param  {mixed} oldValue The previous value of the property
         */
        $notifySubscribers(key, value, oldValue) {
            if(!key) {
                Object.keys(this).forEach((key) => {
                    this.$notifySubscribers(key);
                });

                return;
            }

            if(value === undefined) {
                value = this[key];
            }

            if(this.$callers[key]) {
                Object.keys(this.$callers[key]).forEach(function(uid) {
                    const caller = this.$callers[key][uid];

                    caller.object[caller.property] = caller.reader(caller.object);
                }.bind(this));
            }

            if(this.$watchers[key]) {
                Object.keys(this.$watchers[key]).forEach(function(uid) {
                    this.$watchers[key][uid].call(this, value, oldValue);
                }.bind(this));
            }

            if(this.$directives[key]) {
                Object.keys(this.$directives[key]).forEach(function(uid) {
                    const directive = this.$directives[key][uid];

                    if(directive.handler.update) {
                        directive.handler.update(
                            directive.element,
                            directive.parameters,
                            directive.model,
                            directive.context
                        );
                    }
                }.bind(this));
            }
        }

        /**
         * Clean the directives of an element on the observable
         * @param  {DOMNode} element The element to clean the directives of
         */
        $cleanDirectives(element) {
            if(element.$directives) {
                Object.keys(element.$directives).forEach((name) => {
                    Object.keys(this.$directives).forEach((fieldname) => {
                        let directiveId = element.$uid + name;

                        delete this.$directives[fieldname][directiveId];
                    });
                });
            }

            Object.keys(this).forEach((fieldname) => {
                if(this[fieldname] instanceof EMVObservable) {
                    this[fieldname].$cleanDirectives(element);
                }
            });
        }

        /**
         * Override the default valueOf method
         * @returns {Object} The object data
         */
        valueOf() {
            let result = {};

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

            this.length = initValue.length;
        }

        /**
         * Override the default valueOf method
         * @returns {Object} The object data
         */
        valueOf() {
            return Array.from(this);
        }
    }

    // Copy the prototype functions from Array to EMVObservableArray prototype
    Object.getOwnPropertyNames(Array.prototype).forEach((key) => {
        if(key !== 'constructor') {
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
            let self = this;

            this.uid = guid();
            this.object = object;

            if(typeof handler === 'function') {
                handler = {
                    read : handler
                };
            }

            if(handler.write) {
                this.writer = function(target, value, oldValue) {
                    handler.write.call(target, value, oldValue);
                };
            }

            if(handler.read) {
                this.reader = function(target) {
                    const previousComputed = executingComputed;

                    executingComputed = self;

                    let value;

                    try {
                        value = handler.read.call(target);
                    }
                    catch(err) {
                        value = undefined;
                    }

                    executingComputed = previousComputed;

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

            let computeDirectiveMethod = function(method) {
                if(binder[method]) {
                    this[method] = function(element, parameters, model, context) {
                        if(!element.$uid) {
                            element.$uid = guid();
                        }

                        executingDirective = {
                            element : element,
                            parameters : parameters,
                            model : model,
                            context : context,
                            handler : self,
                            uid : element.$uid + name,
                            name : name
                        };

                        binder[method](element, parameters, model, context);

                        executingDirective = null;
                    };
                }
            }.bind(this);

            computeDirectiveMethod('init');
            computeDirectiveMethod('bind');
            computeDirectiveMethod('update');
        }
    }


    /**
     * This class describes the bevahior of an EMV instance
     */
    class EMV extends EMVObservable {
        /**
         * Constructor
         * @param {Object} param The initial data of the EMV
         */
        constructor(param) {
            super(param.data);

            // Manage the templates
            this.$templates = {};

            if(param.computed) {
                Object.keys(param.computed).forEach(function(key) {
                    this.$computed[key] = new EMVComputed(param.computed[key], this);
                }.bind(this));
            }

            Object.keys(this.$computed).forEach((key) => {
                if(this.$computed[key].reader) {
                    this[key] = this.$computed[key].reader(this);
                }
                else {
                    this[key] = undefined;
                }
            });
        }

        /**
         * Watch for a property value modification
         * @param  {string} prop    The property name
         * @param  {Function} handler The handler to exute when the property value changes.
         *                            This function get two paramters, newValue and oldValue
         */
        $watch(prop, handler) {
            if(Array.isArray(prop)) {
                prop.forEach((subprop) => {
                    this.$watch(subprop, handler);
                });

                return;
            }

            let propSteps = prop.split('.'),
                observable,
                finalProp = propSteps.pop();

            observable = this.$this;

            propSteps.forEach(function(step) {
                observable = observable[step];
            });

            if(!observable) {
                return;
            }

            if(!observable.$watchers[finalProp]) {
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
            let propSteps = prop.split('.'),
                observable,
                finalProp = propSteps.pop();

            observable = this.$this;

            propSteps.forEach(function(step) {
                observable = observable[step];
            });

            if(observable.$watchers[finalProp]) {
                if(handler) {
                    delete observable.$watchers[finalProp][handler.uid];
                }
                else {
                    observable.$watchers[finalProp] = {};
                }
            }
        }


        /**
         * Apply the instance on a DOM node
         * @param  {DOMNode} element The node to apply the EMV instance on
         */
        $apply(element) {
            if(this.$rootElement) {
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
         */
        $clean(element) {
            let elem = element || this.$rootElement;

            if(!elem) {
                return;
            }

            this.$cleanDirectives(elem);

            delete elem.$directives;

            if(elem.children) {
                Array.from(elem.children).forEach((child) => {
                    this.$clean(child);
                });
            }

            delete this.$rootElement;
        }


        /**
         * Parse the directives on the element and init them
         * @param   {DOMNode} element  The element to parse
         * @param   {Array} excludes The directives to no parse on the element
         */
        $parse(element, excludes) {
            const safeStringRegex = new RegExp(escapeRegExp(EMV.config.delimiters[0]) + '(.+?)' + escapeRegExp(EMV.config.delimiters[1]), 'g');
            const htmlStringRegex = new RegExp(escapeRegExp(EMV.config.htmlDelimiters[0]) + '(.+?)' + escapeRegExp(EMV.config.htmlDelimiters[1]), 'g');


            if (element.nodeName.toLowerCase() === 'template') {
                // Parse templates
                this.$templates[element.id] = element.innerHTML;
            }
            else if(element.nodeName.toLowerCase() === '#text') {
                // Parse raw directives in texts
                const value = element.textContent;
                const matchSafe = value.match(safeStringRegex);
                const matchUnsafe = value.match(htmlStringRegex);

                if (matchSafe || matchUnsafe) {
                    this.$getContext(element.parentNode);

                    if (!element.parentNode.$directives) {
                        element.parentNode.$directives = {};
                    }

                    if(matchUnsafe || element.nextElementSibling || element.previousElementSibling) {
                        const parameters = element.parentNode.innerHTML.replace(safeStringRegex, '\' + ($1) + \'')
                                            .replace(htmlStringRegex, '\' + ($1) + \'')
                                            .replace(/^\s+/, '')
                                            .replace(/\s+$/, '');

                        // Unsafe text
                        element.parentNode.$directives.html = {
                            name : 'html',
                            handler : EMV.directives.html,
                            parameters : `'${parameters}'`
                        };
                    }
                    else {
                        const parameters = value.replace(safeStringRegex, '\' + ($1) + \'')
                                        .replace(htmlStringRegex, '\' + ($1) + \'')
                                        .replace(/^\s+/, '')
                                        .replace(/\s+$/, '');

                        // Safe text
                        element.parentNode.$directives.text = {
                            name : 'text',
                            handler : EMV.directives.text,
                            parameters : `'${parameters}'`
                        };
                    }
                }
            }
            else if(element.attributes) {
                // Parse attributes directives
                Object.keys(EMV.directives).forEach((name) => {
                    if(!excludes || excludes.indexOf(name) === -1) {
                        let attribute = `${EMV.config.attributePrefix}-${name}`,
                            parameters = element.getAttribute(attribute);

                        if(parameters) {
                            let directive = EMV.directives[name];

                            if(!element.$directives) {
                                element.$directives = {};
                            }

                            this.$getContext(element);
                            element.$directives[name] = {
                                name : name,
                                handler : directive,
                                parameters : parameters
                            };

                            if(directive.init) {
                                directive.init.call(this, element, parameters, this);
                            }
                        }
                    }
                });

                // Parse raw directives in attributes
                Array.from(element.attributes).forEach((attribute) => {
                    const attributeName = attribute.name;
                    const value = attribute.textContent;
                    const matchSafe = value.match(safeStringRegex);

                    if(matchSafe !== null) {
                        if(!element.$directives) {
                            element.$directives = {};
                        }

                        let attrDirective = element.$directives.attr;

                        let parameters = attrDirective && attrDirective.parameters || '';

                        if(parameters) {
                            parameters = parameters.substring(1, parameters.length - 1) + ',';
                        }

                        parameters += `'${attributeName}' : '${value.replace(safeStringRegex, '\' + ($1) + \'')}'`;

                        parameters = `{${parameters}}`;

                        if(attrDirective) {
                            attrDirective.parameters = parameters;
                        }
                        else {
                            element.$directives.attr = {
                                name : 'attr',
                                handler : EMV.directives.attr,
                                parameters : parameters
                            };
                        }
                    }
                });
            }

            if(element.childNodes) {
                Array.from(element.childNodes).forEach((child) => {
                    this.$parse(child);
                });
            }
        }


        /**
         * Render a node and all it descendants with declared directives
         * @param  {DOMNode} element The node to render
         * @param {Array} excludes The directives to not render on the element
         */
        $render(element, excludes) {
            if(element.$directives) {
                Object.keys(element.$directives).forEach(function(name) {
                    if(!excludes || excludes.indexOf(name) === -1) {
                        let directive = element.$directives[name],
                            handler = directive.handler,
                            parameters = directive.parameters;

                        if(handler.bind) {
                            handler.bind.call(this, element, parameters, this);
                        }
                        if(handler.update) {
                            handler.update.call(this, element, parameters, this);
                        }
                    }
                }.bind(this));
            }


            if(element.childNodes) {
                Array.from(element.childNodes).forEach((child) => {
                    this.$render(child);
                });
            }
        }


        /**
         * Create a context, attached to a DOM node
         * @param  {DOMNode} element       THe node to create a context on
         * @param  {Object} object      The object to insert in the context
         * @param  {Object} otherParams Other parameters to insert in the context
         */
        $createContext(element, object, otherParams) {
            creatingContext = true;

            let context = object;

            if(object instanceof EMVObservable) {
                // context = object;
                context.$this = object;
                context.$parent = object.$parent;
                context.$root = this;
            }
            else {
                context = {
                    $this : object,
                    $parent : object.$parent,
                    $root : this
                };
            }

            let additionalProperties = this.$getAdditionalContextProperties(element);

            additionalProperties.forEach((key) => {
                if(['$this', '$parent', '$root'].indexOf(key) !== -1) {
                    throw new EMVError(`You cannot apply the key '${key}' as additionnal context property`);
                }

                context[key] = element.parentNode.$context[key];
            });

            element.$additionalContextProperties = new Set(Array.from(additionalProperties));

            if(otherParams) {
                Object.keys(otherParams).forEach((key) => {
                    context[key] = otherParams[key];
                    element.$additionalContextProperties.add(key);
                });
            }

            element.$context = context;

            creatingContext = false;
        }

        /**
         * Remove the context of an element
         * @param  {DOMNode} element The element to remove the context of
         */
        $removeContext(element) {
            delete element.$context;

            if(element.children) {
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
            if(element.$context) {
                return element.$context;
            }

            let context = this.$getContext(element.parentNode);

            element.$context = context;

            return context;
        }


        /**
         * Get the contect of a given DOM node
         * @param   {DOMNode} element The node to get the context o
         * @returns {Object}       The DOM node context
         */
        $getAdditionalContextProperties(element) {
            if(element.$additionalContextProperties) {
                return element.$additionalContextProperties;
            }

            if(element === this.$rootElement) {
                return new Set([]);
            }

            let additionalContextProperties = this.$getAdditionalContextProperties(element.parentNode);

            element.$additionalContextProperties = additionalContextProperties;

            return additionalContextProperties;
        }

        /**
         * This method parses parameters in a directive
         * @param   {string} parameters The node attribute value, corresponding the directive attributes
         * @returns {Function}          The parsed function
         */
        $parseDirectiveGetterParameters(parameters) {
            return new Function('$context', `
                let $result;

                with($context) {
                    $result=(${parameters});
                };

                return $result;
            `);
        }

        /**
         * Get the value of a directive parameters
         * @param {string} parameters The directive parameters
         * @param {Object} element    The element the directive is applied on
         * @param {Object} context Force to use this context
         * @returns {mixed}             The calculated value
         */
        $getDirectiveValue(parameters, element, context) {
            let getter = this.$parseDirectiveGetterParameters(parameters);

            try {
                return getter(context || this.$getContext(element));
            }
            catch(err) {
                return undefined;
            }
        }

        /**
         * This method parses parameters in a directive
         * @param   {string} parameters The node attribute value, corresponding the directive attributes
         * @returns {Function}          The parsed function
         */
        $parseDirectiveSetterParameters(parameters) {
            return new Function('$context', '$value', `
                with($context) {
                    ${parameters.replace(reservedWordsRegex, '$this.$1')} = $value;
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
            let setter = this.$parseDirectiveSetterParameters(parameters);

            setter(this.$getContext(element), value);
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
         * Insert or remove an element from it parent element
         * @param {DOMNode} element  The element to insert or remove form the DOM
         * @param {boolean} value    Defines if the element must be created (true) or removed (false)
         * @param {DOMNode} baseon   The element to base on to insert the element. If not set, it is the element itself
         */
        $insertRemoveElement(element, value, baseon) {
            if(!baseon) {
                baseon = element;
            }

            if(value && !baseon.$parent.contains(element)) {
                // Insert the node
                let before = null;

                baseon.$before.every(function(node) {
                    if(baseon.$parent.contains(node)) {
                        before = node;

                        return false;
                    }

                    return true;
                });

                if(before) {
                    if(before.nextElementSibling) {
                        baseon.$parent.insertBefore(element, before.nextElementSibling);
                    }
                    else {
                        baseon.$parent.appendChild(element);
                    }
                }
                else {
                    baseon.$parent.insertBefore(element, element.$parent.firstChild);
                }

                let excludes = null;

                if(executingDirective) {
                    excludes = [executingDirective.name];
                }

                this.$render(element, excludes);
            }
            else if(element.$parent.contains(element) && !value) {
                // remove the node
                element.$parent.removeChild(element);
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
            let value = model.$getDirectiveValue(parameters, element);

            if(value) {
                element.style.display = '';
            }
            else {
                element.style.display = 'none';
            }
        }
    });


    EMV.directive('class', {
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            if (!element.originalClassList) {
                element.originalClassList = [];
                Array.from(element.classList).forEach(function(classname) {
                    element.originalClassList.push(classname);
                });
            }

            // Reset the element to it original class list before applying calculated classes
            Array.from(element.classList).forEach(function(classname) {
                if(element.originalClassList.indexOf(classname) === -1) {
                    element.classList.remove(classname);
                }
            });

            if(!value) {
                return;
            }

            if(typeof value === 'string') {
                value = {
                    [value] : true
                };
            }

            if(typeof value === 'object') {
                Object.keys(value).forEach(function(classname) {
                    let classes = classname.split(' '),
                        classList = element.classList;

                    classes.forEach(function(cl) {
                        if(value[classname]) {
                            classList.add(cl);
                        }
                        else {
                            classList.remove(cl);
                        }
                    });
                });
            }
        }
    });

    EMV.directive('style', {
        update : function(element, parameters, model) {
            let styles = model.$getDirectiveValue(parameters, element);

            if(!styles || typeof styles !== 'object') {
                return;
            }

            Object.keys(styles).forEach(function(attr) {
                let value = styles[attr];

                if(!value) {
                    element.style[attr] = '';
                }
                else {
                    element.style[attr] = value;
                }
            });
        }
    });

    EMV.directive('attr', {
        update : function(element, parameters, model) {
            let attributes = model.$getDirectiveValue(parameters, element);

            if(!attributes || typeof attributes !== 'object') {
                return;
            }

            Object.keys(attributes).forEach(function(attr) {
                let value = attributes[attr];

                if(!value) {
                    element.removeAttribute(attr);
                }
                else {
                    element.setAttribute(attr, value);
                }
            });
        }
    });

    EMV.directive('disabled', {
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            if(!value) {
                element.removeAttribute('disabled');
            }
            else {
                element.setAttribute('disabled', true);
            }
        }
    });

    /**
     * Form control directives
     */
    EMV.directive('value', {
        bind : function(element, parameters, model) {
            element[element.contentEditable ? 'onblur' : 'onchange'] = function() {
                let value;

                let nodeName = element.nodeName.toLowerCase(),
                    type = element.type;

                switch(nodeName) {
                    case 'input' :
                    case 'select' :
                        switch(type) {
                            case 'checkbox' :
                                value = Boolean(element.checked);
                                break;

                            case 'radio' :
                                value = document.querySelector(`input[name="${element.name}"]:checked`).value;
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
                        if(element.contentEditable) {
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

            if(value === undefined) {
                value = '';
            }

            let nodeName = element.nodeName.toLowerCase(),
                type = element.type;

            switch(nodeName) {
                case 'input' :
                case 'select' :
                    switch(type) {
                        case 'checkbox' :
                            element.checked = Boolean(value);
                            break;

                        case 'radio' : {
                            let radio = document.querySelector(`input[name="${element.name}"][value="${value}"]`);

                            if(radio) {
                                radio.checked = true;
                            }
                            break;
                        }

                        default :
                            element.value = value;
                            break;
                    }
                    break;

                case 'textarea' :
                    element.value = value;
                    break;

                default :
                    if(element.contentEditable) {
                        element.innerHTML = value;
                    }
                    else {
                        element.value = value;
                    }
                    break;
            }
        }
    });

    EMV.directive('input', {
        bind : function(element, parameters, model) {
            element.addEventListener('input', function() {
                model.$setDirectiveValue(parameters, element, element.value);
            });
        },
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            element.value = value;
        }
    });

    EMV.directive('focus', {
        bind : function(element, parameters, model) {
            element.addEventListener('focus', function() {
                model.$setDirectiveValue(parameters, element, true);
            });

            element.addEventListener('blur', function() {
                model.$setDirectiveValue(parameters, element, false);
            });
        },
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            if(value && element !== document.activeElement) {
                element.focus();
            }
            else if(!value && element === document.activeElement) {
                element.blur();
            }
        }
    });

    EMV.directive('options', {
        update : function(element, parameters, model) {
            if(element.nodeName.toLowerCase() !== 'select') {
                throw new EMVError('options directive can be applied only on select tags');
            }

            let value = model.$getDirectiveValue(parameters, element),
                options = value;

            if(!value) {
                return;
            }

            if('$data' in value && !value.$data) {
                return;
            }

            if(value.$data) {
                options = {};
                Object.keys(value.$data).forEach(function(key) {
                    let line = value.$data[key];
                    let optionValue = value.$value ? line[value.$value] : key;
                    let optionLabel = value.$label ? line[value.$label] : line;

                    options[optionValue] = optionLabel;
                });
            }

            // Reset the select
            let currentValue = element.value || value.$selected;

            element.innerHTML = '';

            // Insert the options tags
            let insertOptionTag = function(value, label) {
                let optionTag = document.createElement('option');

                optionTag.value = value;
                optionTag.innerText = label;
                if(value.toString() === currentValue) {
                    optionTag.selected = true;
                }

                element.appendChild(optionTag);
            };

            Object.keys(options).forEach(function(value) {
                let label = options[value];

                insertOptionTag(value, label);
            });
        }
    });


    /**
     * Content directives
     */
    EMV.directive('text', {
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            element.innerText = value;
        }
    });

    EMV.directive('html', {
        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            element.innerHTML = value;
        }
    });


    /**
     * Events directives
     */
    EMV.directive('click', {
        bind : function(element, parameters, model) {
            let action = model.$parseDirectiveGetterParameters(parameters);

            element.onclick = function(event) {
                let ctx = model.$getContext(element);
                let result = action(ctx, event);

                if(typeof result === 'function') {
                    result.call(ctx.$this, ctx, event);
                }
            };
        }
    });

    EMV.directive('on', {
        bind : function(element, parameters, model) {
            let parser = model.$parseDirectiveGetterParameters(parameters),
                events = parser(model.$getContext(element));


            if(typeof events !== 'object') {
                return;
            }

            Object.keys(events).forEach(function(event) {
                let action = events[event],
                    listener = `on${event}`;

                element[listener] = function(event) {
                    action(model.$getContext(element), event);
                };
            });
        }
    });

    EMV.directive('submit', {
        bind : function(element, parameters, model) {
            if(element.nodeName.toLowerCase() !== 'form') {
                throw new EMVError('submit directive can be applied only on form tags');
            }
            let action = model.$parseDirectiveGetterParameters(parameters);

            element.addEventListener('submit', function(event) {
                let result = action(model.$getContext(element));

                if(typeof result === 'function') {
                    result(model.$getContext(element), event);
                }
            });
        }
    });


    var initElementPreviousSibliings = function(element) {
        element.$before = [];

        if(element.previousElementSibling) {
            element.$before = [element.previousElementSibling];

            if(element.previousElementSibling.$before) {
                element.$before = element.$before.concat(element.previousElementSibling.$before);
            }
        }

        element.$parent = element.parentNode;
    };

    /**
     * Dom maniuplation directives
     */
    EMV.directive('each', {
        init : function(element, parameters) {
            initElementPreviousSibliings(element);

            let parent = element.parentNode;
            let uid = guid();

            element.$clones = [];


            let replacer = document.createElement(element.nodeName);

            replacer.$eachElement = element;
            replacer.$directives = {
                each : element.$directives.each
            };

            delete element.$directives.each;

            replacer.setAttribute(EMV.config.attributePrefix + '-each', parameters);
            replacer.id = uid;

            parent.replaceChild(replacer, element);
        },

        update : function(replacer, parameters, model) {
            // Get the real element
            let element = replacer.$eachElement;

            let param = model.$getDirectiveValue(parameters, element);

            // Reset the list
            element.$clones.forEach(function(clone) {
                if(clone.parentNode && clone.parentNode.contains(clone)) {
                    clone.parentNode.removeChild(clone);
                }
            });

            // Remove the element itself
            if(replacer.parentNode && replacer.parentNode.contains(replacer)) {
                replacer.parentNode.removeChild(replacer);
            }

            element.$clones = [];

            if(param) {
                let list = param && Array.from('$data' in param ? param.$data : param) || [];

                list = list.filter((item) => {
                    return item;
                });

                // Filter the list
                if(param.$filter) {
                    list = list.filter(param.$filter);
                }

                // Order the list
                if(param.$sort) {
                    if(typeof param.$sort === 'function') {
                        list.sort(param.$sort);
                    }
                    else {
                        list.sort(function(item1, item2) {
                            return item1[param.$sort] < item2[param.$sort] ? -1 : 1;
                        });
                    }
                }

                if(param.$order && param.$order < 0) {
                    list.reverse();
                }

                let offset = param.$offset || 0,
                    end = offset + (param.$limit || list.length);

                list = list.slice(offset, end);
                // Reverse the list to insert the items in the right order, because the insertion uses insertbefore
                list.reverse();

                list.forEach(function(item, index) {
                    // Get the real index, because the list is reversed
                    let realIndex = list.length - 1 - index;
                    let additionalProperties = {
                        $index : realIndex
                    };

                    if (param.$item) {
                        additionalProperties['$' + param.$item] = item;
                    }

                    let clone = element.cloneNode(true);

                    clone.$parent = element.$parent;
                    clone.$directives = element.$directives;
                    delete clone.$directives.each;

                    // Insert the clone
                    model.$insertRemoveElement(clone, true, element);

                    // Create the sub context for the item
                    model.$createContext(clone, item, additionalProperties);

                    // Add the clone to the list of the element clones
                    element.$clones.push(clone);

                    model.$parse(clone, ['each']);
                    model.$render(clone, ['each']);
                });
            }
        }
    });

    EMV.directive('if', {
        init : function(element) {
            initElementPreviousSibliings(element);
        },

        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            model.$insertRemoveElement(element, Boolean(value));
        }
    });

    EMV.directive('unless', {
        init : function(element) {
            initElementPreviousSibliings(element);
        },

        update : function(element, parameters, model) {
            let value = model.$getDirectiveValue(parameters, element);

            model.$insertRemoveElement(element, !value);
        }
    });

    EMV.directive('with', {
        init : (element, parameters, model) => {
            let context = model.$getDirectiveValue(
                parameters,
                element === model.$rootElement ? element : element.parentNode
            );

            model.$createContext(element, context);
        },
        update : (element, parameters, model) => {
            let context;

            if(element === model.$rootElement) {
                context = model.$getDirectiveValue(parameters, element, model);
            }
            else if(element.parentNode) {
                model.$removeContext(element);
                context = model.$getDirectiveValue(parameters, element.parentNode);
            }
            else {
                return;
            }

            model.$createContext(element, context);

            model.$render(element, ['with']);
        }
    });

    EMV.directive('template', {
        update : function(element, parameters, model) {
            let templateName = model.$getDirectiveValue(parameters, element);

            let template = model.$templates[templateName] || '';

            // Insert the template
            element.innerHTML = template;

            // Parse and render the content
            if(element.childNodes) {
                Array.from(element.childNodes).forEach((child) => {
                    model.$createContext(child, model.$getContext(element));

                    model.$parse(child);

                    model.$render(child);
                });
            }
        }
    });

    // Define the default EMV configuration
    EMV.config = {
        attributePrefix : 'e',
        delimiters : ['${', '}'],
        htmlDelimiters : ['!{', '}']
    };

    // Define the version
    Object.defineProperty(EMV, 'version', {
        value : '1.0.1',
        writable : false
    });

    // Overwrite Array.isArray function to make EMVObservableArray to return true
    const originalIsArray = Array.isArray;

    Array.isArray = function(variable) {
        if(variable instanceof EMVObservableArray) {
            return true;
        }

        return originalIsArray(variable);
    };

    return EMV;
});