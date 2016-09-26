/*global define, module, exports*/
/* eslint no-invalid-this:0 */

/*!
 * emv.js v1.0.0
 * 2016 Sébastien Lecocq
 * Released under the MIT License.
 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

(function (global, factory) {
    if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object' && typeof module !== 'undefined') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        global.EMV = factory();
    }
})(undefined, function () {
    var executingComputed = null,
        executingDirective = null,
        creatingContext = false;

    var reservedWords = ['break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'finally', 'for', 'if', 'in', 'instanceof', 'new', 'return', 'switch', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'class', 'enum', 'export', 'extends', 'import', 'super', 'implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield'];

    var reservedWordsRegex = new RegExp('\\b(' + reservedWords.join('|') + ')\\b', 'g');

    /**
     * Generate a unique id
     * @returns {[type]} [description]
     */
    function guid() {
        var s4 = function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
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
        var types = ['string', 'number', 'boolean', 'undefined', 'symbol'];

        return types.indexOf(typeof variable === 'undefined' ? 'undefined' : _typeof(variable)) !== -1 || variable === null;
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

    var EMVError = function (_Error) {
        _inherits(EMVError, _Error);

        /**
         * Constructor
         * @param   {string} message The error message
         */
        function EMVError(message) {
            _classCallCheck(this, EMVError);

            var fullMessage = 'EMV Error : ' + message;

            return _possibleConstructorReturn(this, (EMVError.__proto__ || Object.getPrototypeOf(EMVError)).call(this, fullMessage));
        }

        return EMVError;
    }(Error);

    /**
     * This class describes the behavior of observable data in EMV engine.
     * This is the most important class in EMV
     */


    var EMVObservable = function (_Array) {
        _inherits(EMVObservable, _Array);

        /**
         * Constructor
         * @param  {Object} initValue       The initial value to set on the observable
         * @param  {EMV} $root              The root EMV instance
         * @param  {EMVObservable} $parent  The parent object, containing this one
         * @param  {string} upperKey        The key to retrieve this object from the parent object
         */
        function EMVObservable(initValue, $root, $parent, upperKey) {
            var _ret;

            _classCallCheck(this, EMVObservable);

            var _this2 = _possibleConstructorReturn(this, (EMVObservable.__proto__ || Object.getPrototypeOf(EMVObservable)).call(this));

            _this2.$callers = {};
            _this2.$directives = {};
            _this2.$watchers = {};
            _this2.$root = $root || _this2;
            _this2.$parent = $parent;
            _this2.$computed = {};
            _this2.$this = _this2;

            var proxyHandler = {
                get: function (object, key) {
                    if (typeof key !== 'string') {
                        return object[key];
                    }

                    var value = object[key];

                    if (key.substr(0, 1) === '$') {
                        return this[key];
                    }

                    if (this.$root && typeof value !== 'function') {
                        if (executingComputed) {
                            if (!this.$callers[key]) {
                                this.$callers[key] = {};
                            }
                            // Find if this computed already registred in the observable computed
                            if (!this.$callers[key][executingComputed.uid]) {
                                Object.keys(this.$root.$computed).every(function (computedName) {
                                    if (this.$root.$computed[computedName] === executingComputed) {
                                        this.$callers[key][executingComputed.uid] = {
                                            property: computedName,
                                            reader: executingComputed.reader,
                                            writer: executingComputed.writer,
                                            object: executingComputed.object
                                        };

                                        return false;
                                    }

                                    return true;
                                }.bind(this));
                            }
                        }

                        if (executingDirective) {
                            if (!this.$directives[key]) {
                                this.$directives[key] = {};
                            }

                            if (!this.$directives[key][executingDirective.uid]) {
                                this.$directives[key][executingDirective.uid] = executingDirective;
                            }
                        }
                    }

                    return value;
                }.bind(_this2),

                set: function (object, key, value) {
                    if (typeof key !== 'string') {
                        return true;
                    }

                    var notifyParent = false;
                    var internalKey = key.substr(0, 1) === '$';

                    if (!(key in object) && !creatingContext) {
                        // The property is created on the object, it means the parent object has been modified
                        notifyParent = true;
                    }

                    if (internalKey || typeof value === 'function') {
                        object[key] = value;

                        return true;
                    }

                    var oldValue = object[key];

                    if (!isPrimitive(value) && !(value instanceof EMVObservable)) {
                        object[key] = new EMVObservable(value, this.$root || object, object, key);
                    } else {
                        object[key] = value;
                        if (value instanceof EMV) {
                            value.$root = this.$root || object;
                            value.$parent = object;
                        }
                    }

                    if (this.$computed[key] && this.$computed[key].writer) {
                        try {
                            this.$computed[key].writer(object, value, oldValue);
                        } catch (err) {}
                    }
                    if (oldValue !== value || Array.isArray(object) && key === 'length') {
                        this.$notifySubscribers(key, value, oldValue);

                        if (notifyParent && this.$parent) {
                            this.$parent.$notifySubscribers(upperKey, this.$parent);
                        }
                    }

                    return true;
                }.bind(_this2),

                deleteProperty: function (object, key) {
                    if (typeof key !== 'string') {
                        return true;
                    }

                    var internalKey = key.substr(0, 1) === '$';

                    var oldValue = object[key];

                    delete object[key];

                    if (!internalKey) {
                        this.$notifySubscribers(key, undefined, oldValue);

                        this.$parent.$notifySubscribers(upperKey, this.$parent);
                    }

                    return true;
                }.bind(_this2),

                ownKeys: function ownKeys(object) {
                    return Object.getOwnPropertyNames(object).filter(function (varname) {
                        return varname.substr(0, 1) !== '$';
                    });
                }
            };

            var proxy = new Proxy(_this2, proxyHandler);

            Object.keys(initValue).forEach(function (key) {
                proxy[key] = initValue[key];
            });

            return _ret = proxy, _possibleConstructorReturn(_this2, _ret);
        }

        /**
         * Notify that a modification has been performed on a property to all of it subscribers
         * @param  {string} key     The property name that changed
         * @param  {mixed} value    The new value of the property
         * @param  {mixed} oldValue The previous value of the property
         */


        _createClass(EMVObservable, [{
            key: '$notifySubscribers',
            value: function $notifySubscribers(key, value, oldValue) {
                var _this3 = this;

                if (!key) {
                    Object.keys(this).forEach(function (key) {
                        _this3.$notifySubscribers(key);
                    });

                    return;
                }

                if (value === undefined) {
                    value = this[key];
                }

                if (this.$callers[key]) {
                    Object.keys(this.$callers[key]).forEach(function (uid) {
                        var caller = this.$callers[key][uid];

                        caller.object[caller.property] = caller.reader(caller.object);
                    }.bind(this));
                }

                if (this.$watchers[key]) {
                    Object.keys(this.$watchers[key]).forEach(function (uid) {
                        this.$watchers[key][uid].call(this, value, oldValue);
                    }.bind(this));
                }

                if (this.$directives[key]) {
                    Object.keys(this.$directives[key]).forEach(function (uid) {
                        var directive = this.$directives[key][uid];

                        if (directive.handler.update) {
                            directive.handler.update(directive.element, directive.parameters, directive.model, directive.context);
                        }
                    }.bind(this));
                }
            }

            /**
             * Test if an observable is an array
             * @returns {boolean} True if the observable is an array
             */

        }, {
            key: '$isArray',
            value: function $isArray() {
                for (var key in this) {
                    if (isNaN(key) && key !== length) {
                        return false;
                    }
                }

                return true;
            }

            /**
             * Clean the directives of an element on the observable
             * @param  {DOMNode} element The element to clean the directives of
             */

        }, {
            key: '$cleanDirectives',
            value: function $cleanDirectives(element) {
                var _this4 = this;

                if (element.$directives) {
                    Object.keys(element.$directives).forEach(function (name) {
                        Object.keys(_this4.$directives).forEach(function (fieldname) {
                            var directiveId = element.$uid + name;

                            delete _this4.$directives[fieldname][directiveId];
                        });
                    });
                }

                Object.keys(this).forEach(function (fieldname) {
                    if (_this4[fieldname] instanceof EMVObservable) {
                        _this4[fieldname].$cleanDirectives(element);
                    }
                });
            }

            /**
             * Override the default valueOf method
             * @returns {Object} The object data
             */

        }, {
            key: 'valueOf',
            value: function valueOf() {
                var _this5 = this;

                var result = this.$isArray() ? [] : {};

                Object.keys(this).forEach(function (key) {
                    result[key] = _this5[key] ? _this5[key].valueOf() : _this5[key];
                });

                return result;
            }

            /**
             * Override the default 'toString' method to return the JSON notation of the obejct
             * @returns {string} The JSON notation of the observable
             */

        }, {
            key: 'toString',
            value: function toString() {
                return JSON.stringify(this.valueOf());
            }
        }]);

        return EMVObservable;
    }(Array);

    /**
     * This class describes the bahavior of EMV computed values
     */


    var EMVComputed =
    /**
     * Constructor
     * @param {Function} handler    The function that will be executed to render the property value
     * @param {Object} object       The object this computed is affected on
     */
    function EMVComputed(handler, object) {
        _classCallCheck(this, EMVComputed);

        var self = this;

        this.uid = guid();
        this.object = object;

        if (typeof handler === 'function') {
            handler = {
                read: handler
            };
        }

        if (handler.write) {
            this.writer = function (target, value, oldValue) {
                handler.write.call(target, value, oldValue);
            };
        }

        if (handler.read) {
            this.reader = function (target) {
                var previousComputed = executingComputed;

                executingComputed = self;

                var value = void 0;

                try {
                    value = handler.read.call(target);
                } catch (err) {
                    value = undefined;
                }

                executingComputed = previousComputed;

                return value;
            };
        }
    };

    /**
     * This class describes the global behavior of EMV directives
     */


    var EMVDirective =
    /**
     * Constructor
     * @param {string} name     The directive name
     * @param {Object} binder   An object containing three methods :
     *                          - init : This method is executed at EMV initialisation ,
     *                          - bind : This method is used to bind the view events throw the model
     *                          - update : This method is executed each time a variable of the model,
     *                                      which this directive depends on, is modified
     */
    function EMVDirective(name, binder) {
        _classCallCheck(this, EMVDirective);

        this.name = name;

        var self = this;

        var computeDirectiveMethod = function (method) {
            if (binder[method]) {
                this[method] = function (element, parameters, model, context) {
                    if (!element.$uid) {
                        element.$uid = guid();
                    }

                    executingDirective = {
                        element: element,
                        parameters: parameters,
                        model: model,
                        context: context,
                        handler: self,
                        uid: element.$uid + name,
                        name: name
                    };

                    binder[method](element, parameters, model, context);

                    executingDirective = null;
                };
            }
        }.bind(this);

        computeDirectiveMethod('init');
        computeDirectiveMethod('bind');
        computeDirectiveMethod('update');
    };

    /**
     * This class describes the bevahior of an EMV instance
     */


    var EMV = function (_EMVObservable) {
        _inherits(EMV, _EMVObservable);

        /**
         * Constructor
         * @param {Object} param The initial data of the EMV
         */
        function EMV(param) {
            _classCallCheck(this, EMV);

            // Manage the templates
            var _this6 = _possibleConstructorReturn(this, (EMV.__proto__ || Object.getPrototypeOf(EMV)).call(this, param.data));

            _this6.$templates = {};

            if (param.computed) {
                Object.keys(param.computed).forEach(function (key) {
                    this.$computed[key] = new EMVComputed(param.computed[key], this);
                }.bind(_this6));
            }

            Object.keys(_this6.$computed).forEach(function (key) {
                if (_this6.$computed[key].reader) {
                    _this6[key] = _this6.$computed[key].reader(_this6);
                } else {
                    _this6[key] = undefined;
                }
            });
            return _this6;
        }

        /**
         * Watch for a property value modification
         * @param  {string} prop    The property name
         * @param  {Function} handler The handler to exute when the property value changes.
         *                            This function get two paramters, newValue and oldValue
         */


        _createClass(EMV, [{
            key: '$watch',
            value: function $watch(prop, handler) {
                var _this7 = this;

                if (Array.isArray(prop)) {
                    prop.forEach(function (subprop) {
                        _this7.$watch(subprop, handler);
                    });

                    return;
                }

                var propSteps = prop.split('.'),
                    observable = void 0,
                    finalProp = propSteps.pop();

                observable = this.$this;

                propSteps.forEach(function (step) {
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
             * @param  {string}   prop          The property name
             * @param  {Function} handlerUID    The handler uid to remove from watchers. If not set,
             *                                  all watchers on this property are unbound
             */

        }, {
            key: '$unwatch',
            value: function $unwatch(prop, handlerUID) {
                var propSteps = prop.split('.'),
                    observable = void 0;

                observable = this.$this;

                propSteps.forEach(function (step) {
                    observable = observable[step];
                });

                if (handlerUID) {
                    delete observable.$watchers[handlerUID];
                } else {
                    observable.$watchers = {};
                }
            }

            /**
             * Apply the instance on a DOM node
             * @param  {DOMNode} element The node to apply the EMV instance on
             */

        }, {
            key: '$apply',
            value: function $apply(element) {
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
             */

        }, {
            key: '$clean',
            value: function $clean(element) {
                var _this8 = this;

                var elem = element || this.$rootElement;

                if (!elem) {
                    return;
                }

                this.$cleanDirectives(elem);

                delete elem.$directives;

                if (elem.children) {
                    Array.from(elem.children).forEach(function (child) {
                        _this8.$clean(child);
                    });
                }

                delete this.$rootElement;
            }

            /**
             * Parse the directives on the element and init them
             * @param   {DOMNode} element  The element to parse
             * @param   {Array} excludes The directives to no parse on the element
             */

        }, {
            key: '$parse',
            value: function $parse(element, excludes) {
                var _this9 = this;

                var safeStringRegex = new RegExp(escapeRegExp(EMV.config.delimiters[0]) + '(.+?)' + escapeRegExp(EMV.config.delimiters[1]), 'g');
                var htmlStringRegex = new RegExp(escapeRegExp(EMV.config.htmlDelimiters[0]) + '(.+?)' + escapeRegExp(EMV.config.htmlDelimiters[1]), 'g');

                if (element.nodeName.toLowerCase() === 'template') {
                    // Parse templates
                    this.$templates[element.id] = element.innerHTML;
                } else if (element.nodeName.toLowerCase() === '#text') {
                    // Parse raw directives in texts
                    var value = element.textContent;
                    var matchSafe = value.match(safeStringRegex);
                    var matchUnsafe = value.match(htmlStringRegex);

                    if (matchSafe || matchUnsafe) {
                        this.$getContext(element.parentNode);

                        if (!element.parentNode.$directives) {
                            element.parentNode.$directives = {};
                        }

                        var parameters = value.replace(safeStringRegex, '\' + ($1) + \'').replace(htmlStringRegex, '\' + ($1) + \'').replace(/^\s+/, '').replace(/\s+$/, '');

                        if (matchUnsafe) {
                            // Unsafe text
                            element.parentNode.$directives.html = {
                                name: 'html',
                                handler: EMV.directives.html,
                                parameters: '\'' + parameters + '\''
                            };
                        } else {
                            // Safe text
                            element.parentNode.$directives.text = {
                                name: 'text',
                                handler: EMV.directives.text,
                                parameters: '\'' + parameters + '\''
                            };
                        }
                    }
                } else if (element.attributes) {
                    // Parse attributes directives
                    Object.keys(EMV.directives).forEach(function (name) {
                        if (!excludes || excludes.indexOf(name) === -1) {
                            var attribute = EMV.config.attributePrefix + '-' + name,
                                _parameters = element.getAttribute(attribute);

                            if (_parameters) {
                                var directive = EMV.directives[name];

                                if (!element.$directives) {
                                    element.$directives = {};
                                }

                                _this9.$getContext(element);
                                element.$directives[name] = {
                                    name: name,
                                    handler: directive,
                                    parameters: _parameters
                                };

                                if (directive.init) {
                                    directive.init.call(_this9, element, _parameters, _this9);
                                }
                            }
                        }
                    });

                    // Parse raw directives in attributes
                    Array.from(element.attributes).forEach(function (attribute) {
                        var attributeName = attribute.name;
                        var value = attribute.textContent;
                        var matchSafe = value.match(safeStringRegex);

                        if (matchSafe !== null) {
                            if (!element.$directives) {
                                element.$directives = {};
                            }

                            var attrDirective = element.$directives.attr;

                            var _parameters2 = attrDirective && attrDirective.parameters || '';

                            if (_parameters2) {
                                _parameters2 = _parameters2.substring(1, _parameters2.length - 1) + ',';
                            }

                            _parameters2 += attributeName + ' : \'' + value.replace(safeStringRegex, '\' + ($1) + \'') + '\'';

                            _parameters2 = '{' + _parameters2 + '}';

                            if (attrDirective) {
                                attrDirective.parameters = _parameters2;
                            } else {
                                element.$directives.attr = {
                                    name: 'attr',
                                    handler: EMV.directives.attr,
                                    parameters: _parameters2
                                };
                            }
                        }
                    });
                }

                if (element.childNodes) {
                    Array.from(element.childNodes).forEach(function (child) {
                        _this9.$parse(child);
                    });
                }
            }

            /**
             * Render a node and all it descendants with declared directives
             * @param  {DOMNode} element The node to render
             * @param {Array} excludes The directives to not render on the element
             */

        }, {
            key: '$render',
            value: function $render(element, excludes) {
                var _this10 = this;

                if (element.$directives) {
                    Object.keys(element.$directives).forEach(function (name) {
                        if (!excludes || excludes.indexOf(name) === -1) {
                            var directive = element.$directives[name],
                                handler = directive.handler,
                                parameters = directive.parameters;

                            if (handler.bind) {
                                handler.bind.call(this, element, parameters, this);
                            }
                            if (handler.update) {
                                handler.update.call(this, element, parameters, this);
                            }
                        }
                    }.bind(this));
                }

                if (element.childNodes) {
                    Array.from(element.childNodes).forEach(function (child) {
                        _this10.$render(child);
                    });
                }
            }

            /**
             * Create a context, attached to a DOM node
             * @param  {DOMNode} element       THe node to create a context on
             * @param  {Object} object      The object to insert in the context
             * @param  {Object} otherParams Other parameters to insert in the context
             */

        }, {
            key: '$createContext',
            value: function $createContext(element, object, otherParams) {
                creatingContext = true;

                var context = object;

                if (object instanceof EMVObservable) {
                    // context = object;
                    context.$this = object;
                    context.$parent = object.$parent;
                    context.$root = this;
                } else {
                    context = {
                        $this: object,
                        $parent: object.$parent,
                        $root: this
                    };
                }

                var additionalProperties = this.$getAdditionalContextProperties(element);

                additionalProperties.forEach(function (key) {
                    if (['$this', '$parent', '$root'].indexOf(key) !== -1) {
                        throw new EMVError('You cannot apply the key \'' + key + '\' as additionnal context property');
                    }

                    context[key] = element.parentNode.$context[key];
                });

                element.$additionalContextProperties = new Set(Array.from(additionalProperties));

                if (otherParams) {
                    Object.keys(otherParams).forEach(function (key) {
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

        }, {
            key: '$removeContext',
            value: function $removeContext(element) {
                var _this11 = this;

                delete element.$context;

                if (element.children) {
                    Array.from(element.children).forEach(function (child) {
                        _this11.$removeContext(child);
                    });
                }
            }

            /**
             * Get the contect of a given DOM node
             * @param   {DOMNode} element The node to get the context o
             * @returns {Object}       The DOM node context
             */

        }, {
            key: '$getContext',
            value: function $getContext(element) {
                if (element.$context) {
                    return element.$context;
                }

                var context = this.$getContext(element.parentNode);

                element.$context = context;

                return context;
            }

            /**
             * Get the contect of a given DOM node
             * @param   {DOMNode} element The node to get the context o
             * @returns {Object}       The DOM node context
             */

        }, {
            key: '$getAdditionalContextProperties',
            value: function $getAdditionalContextProperties(element) {
                if (element.$additionalContextProperties) {
                    return element.$additionalContextProperties;
                }

                if (element === this.$rootElement) {
                    return new Set([]);
                }

                var additionalContextProperties = this.$getAdditionalContextProperties(element.parentNode);

                element.$additionalContextProperties = additionalContextProperties;

                return additionalContextProperties;
            }

            /**
             * This method parses parameters in a directive
             * @param   {string} parameters The node attribute value, corresponding the directive attributes
             * @returns {Function}          The parsed function
             */

        }, {
            key: '$parseDirectiveGetterParameters',
            value: function $parseDirectiveGetterParameters(parameters) {
                return new Function('$context', '\n                var result;\n                with($context) {\n                    result=(' + parameters + ');\n                    // result=(' + parameters.replace(reservedWordsRegex, '$this.$1') + ');\n                };\n                return result;\n            ');
            }

            /**
             * Get the value of a directive parameters
             * @param {string} parameters The directive parameters
             * @param {Object} element    The element the directive is applied on
             * @param {Object} context Force to use this context
             * @returns {mixed}             The calculated value
             */

        }, {
            key: '$getDirectiveValue',
            value: function $getDirectiveValue(parameters, element, context) {
                var getter = this.$parseDirectiveGetterParameters(parameters);

                try {
                    return getter(context || this.$getContext(element));
                } catch (err) {
                    return undefined;
                }
            }

            /**
             * This method parses parameters in a directive
             * @param   {string} parameters The node attribute value, corresponding the directive attributes
             * @returns {Function}          The parsed function
             */

        }, {
            key: '$parseDirectiveSetterParameters',
            value: function $parseDirectiveSetterParameters(parameters) {
                return new Function('$context', '$value', '\n                with($context) {\n                    ' + parameters.replace(reservedWordsRegex, '$this.$1') + ' = $value;\n                }\n            ');
            }

            /**
             * Set the value on the property defined by the directive parameters
             * @param {string}  parameters The directive parameters
             * @param {DOMNode} element    The element the directive is applied on
             * @param {mixed}   value      The value to set
             */

        }, {
            key: '$setDirectiveValue',
            value: function $setDirectiveValue(parameters, element, value) {
                var setter = this.$parseDirectiveSetterParameters(parameters);

                setter(this.$getContext(element), value);
            }

            /**
             * Create a directive for EMV
             * @param {string} name   The directive name
             * @param {Object} binder The directive description. This object contains two methods bind and update
             */

        }, {
            key: '$insertRemoveElement',


            /**
             * Insert or remove an element from it parent element
             * @param {DOMNode} element  The element to insert or remove form the DOM
             * @param {boolean} value    Defines if the element must be created (true) or removed (false)
             * @param {DOMNode} baseon   The element to base on to insert the element. If not set, it is the element itself
             */
            value: function $insertRemoveElement(element, value, baseon) {
                if (!baseon) {
                    baseon = element;
                }

                if (value && !baseon.$parent.contains(element)) {
                    // Insert the node
                    var before = null;

                    baseon.$before.every(function (node) {
                        if (baseon.$parent.contains(node)) {
                            before = node;

                            return false;
                        }

                        return true;
                    });

                    if (before) {
                        if (before.nextElementSibling) {
                            baseon.$parent.insertBefore(element, before.nextElementSibling);
                        } else {
                            baseon.$parent.appendChild(element);
                        }
                    } else {
                        baseon.$parent.insertBefore(element, element.$parent.firstChild);
                    }

                    var excludes = null;

                    if (executingDirective) {
                        excludes = [executingDirective.name];
                    }

                    this.$render(element, excludes);
                } else if (element.$parent.contains(element) && !value) {
                    // remove the node
                    element.$parent.removeChild(element);
                }
            }
        }], [{
            key: 'directive',
            value: function directive(name, binder) {
                this.directives[name] = new EMVDirective(name, binder);
            }
        }]);

        return EMV;
    }(EMVObservable);

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
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            if (value) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        }
    });

    EMV.directive('class', {
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            if (!element.originalClassList) {
                element.originalClassList = [];
                element.classList.forEach(function (classname) {
                    element.originalClassList.push(classname);
                });
            }

            // Reset the element to it original class list before applying calculated classes
            element.classList.forEach(function (classname) {
                if (element.originalClassList.indexOf(classname) === -1) {
                    element.classList.remove(classname);
                }
            });

            if (!value) {
                return;
            }

            if (typeof value === 'string') {
                value = _defineProperty({}, value, true);
            }

            if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
                Object.keys(value).forEach(function (classname) {
                    var classes = classname.split(' '),
                        classList = element.classList;

                    classes.forEach(function (cl) {
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
        update: function update(element, parameters, model) {
            var styles = model.$getDirectiveValue(parameters, element);

            if (!styles || (typeof styles === 'undefined' ? 'undefined' : _typeof(styles)) !== 'object') {
                return;
            }

            Object.keys(styles).forEach(function (attr) {
                var value = styles[attr];

                if (!value) {
                    delete element.style[attr];
                } else {
                    element.style[attr] = value;
                }
            });
        }
    });

    EMV.directive('attr', {
        update: function update(element, parameters, model) {
            var attributes = model.$getDirectiveValue(parameters, element);

            if (!attributes || (typeof attributes === 'undefined' ? 'undefined' : _typeof(attributes)) !== 'object') {
                return;
            }

            Object.keys(attributes).forEach(function (attr) {
                var value = attributes[attr];

                if (!value) {
                    element.removeAttribute(attr);
                } else {
                    element.setAttribute(attr, value);
                }
            });
        }
    });

    EMV.directive('disabled', {
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

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
        bind: function bind(element, parameters, model) {
            element.onchange = function () {
                var value = void 0;

                var nodeName = element.nodeName.toLowerCase(),
                    type = element.type;

                switch (nodeName) {
                    case 'input':
                    case 'select':
                        switch (type) {
                            case 'checkbox':
                                value = Boolean(element.checked);
                                break;

                            case 'radio':
                                value = document.querySelector('input[name="' + element.name + '"]:checked').value;
                                break;

                            default:
                                value = element.value;
                                break;
                        }
                        break;

                    case 'textarea':
                        value = element.value;
                        break;

                    default:
                        return;
                }

                model.$setDirectiveValue(parameters, element, value);
            };
        },
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            if (value === undefined) {
                value = '';
            }

            var nodeName = element.nodeName.toLowerCase(),
                type = element.type;

            switch (nodeName) {
                case 'input':
                case 'select':
                    switch (type) {
                        case 'checkbox':
                            element.checked = Boolean(value);
                            break;

                        case 'radio':
                            {
                                var radio = document.querySelector('input[name="' + element.name + '"][value="' + value + '"]');

                                if (radio) {
                                    radio.checked = true;
                                }
                                break;
                            }

                        default:
                            element.value = value;
                            break;
                    }
                    break;

                case 'textarea':
                    element.value = value;
                    break;

                default:
                    element.value = value;
            }
        }
    });

    EMV.directive('input', {
        bind: function bind(element, parameters, model) {
            element.addEventListener('input', function () {
                model.$setDirectiveValue(parameters, element, element.value);
            });
        },
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            element.value = value;
        }
    });

    EMV.directive('focus', {
        bind: function bind(element, parameters, model) {
            element.addEventListener('focus', function () {
                model.$setDirectiveValue(parameters, element, true);
            });

            element.addEventListener('blur', function () {
                model.$setDirectiveValue(parameters, element, false);
            });
        },
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            if (value) {
                element.focus();
            } else {
                element.blur();
            }
        }
    });

    EMV.directive('options', {
        update: function update(element, parameters, model) {
            if (element.nodeName.toLowerCase() !== 'select') {
                throw new EMVError('options directive can be applied only on select tags');
            }

            var value = model.$getDirectiveValue(parameters, element),
                options = value;

            if (!value) {
                return;
            }

            if ('$data' in value && !value.$data) {
                return;
            }

            if (value.$data) {
                options = {};
                Object.keys(value.$data).forEach(function (key) {
                    if (Array.isArray(value.$data) && key === 'length') {
                        return;
                    }

                    var line = value.$data[key];
                    var optionValue = value.$value ? line[value.$value] : key;
                    var optionLabel = value.$label ? line[value.$label] : line;

                    options[optionValue] = optionLabel;
                });
            }

            // Reset the select
            var currentValue = element.value || value.$selected;

            element.innerHTML = '';

            // Insert the options tags
            var insertOptionTag = function insertOptionTag(value, label) {
                var optionTag = document.createElement('option');

                optionTag.value = value;
                optionTag.innerText = label;
                if (value.toString() === currentValue) {
                    optionTag.selected = true;
                }

                element.appendChild(optionTag);
            };

            if (Array.isArray(options)) {
                options.forEach(function (label, value) {
                    insertOptionTag(value, label);
                });
            } else {
                Object.keys(options).forEach(function (value) {
                    var label = options[value];

                    insertOptionTag(value, label);
                });
            }

            if (element.onchange) {
                element.onchange();
            }
        }
    });

    /**
     * Content directives
     */
    EMV.directive('text', {
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            element.innerText = value;
        }
    });

    EMV.directive('html', {
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            element.innerHTML = value;
        }
    });

    /**
     * Events directives
     */
    EMV.directive('click', {
        bind: function bind(element, parameters, model) {
            var action = model.$parseDirectiveGetterParameters(parameters);

            element.onclick = function (event) {
                var ctx = model.$getContext(element);
                var result = action(ctx, event);

                if (typeof result === 'function') {
                    result.call(ctx.$this, ctx, event);
                }
            };
        }
    });

    EMV.directive('on', {
        bind: function bind(element, parameters, model) {
            var parser = model.$parseDirectiveGetterParameters(parameters),
                events = parser(model.$getContext(element));

            if ((typeof events === 'undefined' ? 'undefined' : _typeof(events)) !== 'object') {
                return;
            }

            Object.keys(events).forEach(function (event) {
                var action = events[event],
                    listener = 'on' + event;

                element[listener] = function (event) {
                    action(model.$getContext(element), event);
                };
            });
        }
    });

    EMV.directive('submit', {
        bind: function bind(element, parameters, model) {
            if (element.nodeName.toLowerCase() !== 'form') {
                throw new EMVError('submit directive can be applied only on form tags');
            }
            var action = model.$parseDirectiveGetterParameters(parameters);

            element.addEventListener('submit', function (event) {
                var result = action(model.$getContext(element));

                if (typeof result === 'function') {
                    result(model.$getContext(element), event);
                }
            });
        }
    });

    var initElementPreviousSibliings = function initElementPreviousSibliings(element) {
        element.$before = [];

        if (element.previousElementSibling) {
            element.$before = [element.previousElementSibling];

            if (element.previousElementSibling.$before) {
                element.$before = element.$before.concat(element.previousElementSibling.$before);
            }
        }

        element.$parent = element.parentNode;
    };

    /**
     * Dom maniuplation directives
     */
    EMV.directive('each', {
        options: {
            comments: true
        },

        init: function init(element, parameters) {
            initElementPreviousSibliings(element);

            var parent = element.parentNode;
            var uid = guid();

            element.$clones = [];

            var replacer = document.createElement(element.nodeName);

            replacer.$eachElement = element;
            replacer.$directives = {
                each: element.$directives.each
            };

            delete element.$directives.each;

            replacer.setAttribute(EMV.config.attributePrefix + '-each', parameters);
            replacer.id = uid;

            parent.replaceChild(replacer, element);
        },

        update: function update(replacer, parameters, model) {
            // Get the real element
            var element = replacer.$eachElement;

            var param = model.$getDirectiveValue(parameters, element);

            // Reset the list
            element.$clones.forEach(function (clone) {
                if (clone.parentNode && clone.parentNode.contains(clone)) {
                    clone.parentNode.removeChild(clone);
                }
            });

            // Remove the element itself
            if (replacer.parentNode && replacer.parentNode.contains(replacer)) {
                replacer.parentNode.removeChild(replacer);
            }

            element.$clones = [];

            if (param) {
                (function () {
                    var list = param && Array.from('$data' in param ? param.$data : param) || [];

                    list = list.filter(function (item) {
                        return item;
                    });

                    // Filter the list
                    if (param.$filter) {
                        list = list.filter(param.$filter);
                    }

                    // Order the list
                    if (param.$sort) {
                        if (typeof param.$order === 'function') {
                            list.sort(param.$sort);
                        } else {
                            list.sort(function (item1, item2) {
                                return item1[param.$sort] < item2[param.$sort] ? -1 : 1;
                            });
                        }
                    }

                    if (param.$order && param.$order < 0) {
                        list.reverse();
                    }

                    var offset = param.$offset || 0,
                        end = offset + (param.$limit || list.length);

                    list = list.slice(offset, end);
                    // Reverse the list to insert the items in the right order, because the insertion uses insertbefore
                    list.reverse();

                    list.forEach(function (item, index) {
                        // Get the real index, because the list is reversed
                        var realIndex = list.length - 1 - index;
                        var additionalProperties = {
                            $index: realIndex
                        };

                        if (param.$item) {
                            additionalProperties['$' + param.$item] = item;
                        }

                        var clone = element.cloneNode(true);

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
                })();
            }
        }
    });

    EMV.directive('if', {
        init: function init(element) {
            initElementPreviousSibliings(element);
        },

        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            model.$insertRemoveElement(element, Boolean(value));
        }
    });

    EMV.directive('unless', {
        init: function init(element) {
            initElementPreviousSibliings(element);
        },

        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            model.$insertRemoveElement(element, !value);
        }
    });

    EMV.directive('with', {
        init: function init(element, parameters, model) {
            var context = model.$getDirectiveValue(parameters, element === model.$rootElement ? element : element.parentNode);

            model.$createContext(element, context);
        },
        update: function update(element, parameters, model) {
            var context = void 0;

            if (element === model.$rootElement) {
                context = model.$getDirectiveValue(parameters, element, model);
            } else {
                model.$removeContext(element);
                context = model.$getDirectiveValue(parameters, element.parentNode);
            }

            model.$createContext(element, context);

            model.$render(element, ['with']);
        }
    });

    EMV.directive('template', {
        update: function update(element, parameters, model) {
            var templateName = model.$getDirectiveValue(parameters, element);

            var template = model.$templates[templateName];

            // Insert the template
            element.innerHTML = template;

            // Parse and render the content
            if (element.children) {
                Array.from(element.children).forEach(function (child) {
                    model.$createContext(child, model.$getContext(element));

                    model.$parse(child);

                    model.$render(child);
                });
            }
        }
    });

    EMV.config = {
        attributePrefix: 'e',
        templateEngine: '',
        delimiters: ['${', '}'],
        htmlDelimiters: ['!{', '}']
    };

    Object.defineProperty(EMV, 'version', {
        value: '1.0.0',
        writable: false
    });

    return EMV;
});
