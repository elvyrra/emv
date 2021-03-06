/*global define, module, exports*/

/**
 * emv.js 3.2.4
 *
 * @author Elvyrra S.A.S
 * @license http://rem.mit-license.org/ MIT
 */
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
})(this, function () {
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
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }

        return '' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    /**
     * Detect if a value is a primitive value
     *
     * @param {mixed} variable The varname to test
     * @returns {boolean} True if the variable is primitive
     */
    function isPrimitive(variable) {
        var types = ['string', 'number', 'boolean', 'undefined', 'symbol'];

        return types.indexOf(typeof variable === 'undefined' ? 'undefined' : _typeof(variable)) !== -1 || variable === null || variable instanceof Date;
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


    var EMVObservable = function () {
        /**
         * Constructor
         * @param  {Object} initValue       The initial value to set on the observable
         * @param  {EMV} $root              The root EMV instance
         * @param  {EMVObservable} $parent  The parent object, containing this one
         * @param  {string} upperKey        The key to retrieve this object from the parent object
         */
        function EMVObservable(initValue, $root, $parent, upperKey) {
            var _this2 = this;

            _classCallCheck(this, EMVObservable);

            Object.defineProperties(this, {
                $computed: {
                    value: {}
                },
                $observed: {
                    value: new Set([])
                },
                $callers: {
                    value: {}
                },
                $watchers: {
                    value: {}
                },
                $root: {
                    value: $root || this,
                    writable: true
                },
                $parent: {
                    value: $parent,
                    writable: true
                },
                $this: {
                    value: this,
                    writable: true
                },
                $directives: {
                    value: {}
                },
                $object: {
                    value: initValue,
                    writable: true
                },
                $additionalProperties: {
                    value: new Set([]),
                    writable: true
                }
            });

            Object.keys(initValue).forEach(function (key) {
                _this2.$observe(key, initValue[key], upperKey);
            });

            if (initValue.constructor.name !== 'Object') {
                Object.getOwnPropertyNames(initValue.constructor.prototype).forEach(function (functionName) {
                    if (!_this2.constructor.prototype[functionName]) {
                        _this2.constructor.prototype[functionName] = initValue.constructor.prototype[functionName];
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


        _createClass(EMVObservable, [{
            key: '$observe',
            value: function $observe(key, initValue, upperKey) {
                var _this3 = this;

                if (this.$observed.has(key)) {
                    return;
                }

                var handler = {
                    get: function get() {
                        var value = _this3.$object[key];

                        if (_this3.$root && typeof value !== 'function') {
                            if (_this3.$root.$executingComputed) {
                                if (!_this3.$callers[key]) {
                                    _this3.$callers[key] = {};
                                }
                                // Find if this computed already registred in the observable computed
                                if (!_this3.$callers[key][_this3.$root.$executingComputed.uid]) {
                                    var computed = _this3.$root.$executingComputed;
                                    var callerObject = computed.object;

                                    Object.keys(callerObject.$computed).every(function (computedName) {
                                        if (callerObject.$computed[computedName] === computed) {
                                            _this3.$callers[key][computed.uid] = {
                                                property: computedName,
                                                reader: computed.reader,
                                                writer: computed.writer,
                                                object: computed.object
                                            };

                                            return false;
                                        }

                                        return true;
                                    });
                                }
                            }

                            if (_this3.$root.$executingDirective) {
                                if (!_this3.$directives[key]) {
                                    _this3.$directives[key] = new Set([]);
                                }

                                _this3.$directives[key].add(_this3.$root.$executingDirective.uid);
                            }
                        }

                        return value;
                    },

                    set: function set(value) {
                        var notifyParent = false;

                        if (!(key in _this3.$object) && !_this3.$root.$creatingContext) {
                            // The property is created on the object, it means the parent object has been modified
                            notifyParent = true;
                        }

                        if (typeof value === 'function' || value instanceof HTMLElement) {
                            _this3.$object[key] = value;

                            return true;
                        }

                        var oldValue = _this3.$object[key];

                        if (!isPrimitive(value) && !(value instanceof EMVObservable)) {
                            if (Array.isArray(value)) {
                                _this3.$object[key] = new EMVObservableArray(value, _this3.$root || _this3, _this3, key);
                            } else {
                                _this3.$object[key] = new EMVObservable(value, _this3.$root || _this3, _this3, key);
                            }
                        } else {
                            _this3.$object[key] = value;
                            if (value instanceof EMV) {
                                value.$setRoot(_this3.$root || _this3);
                                value.$parent = _this3;
                            }
                        }

                        if (_this3.$computed[key] && _this3.$computed[key].writer) {
                            try {
                                _this3.$computed[key].writer(_this3, value, oldValue);
                            } catch (err) {}
                        }

                        if (oldValue !== value) {
                            _this3.$notifySubscribers(key, value, oldValue);

                            if (notifyParent && _this3.$parent) {
                                _this3.$parent.$notifySubscribers(upperKey, _this3.$parent);
                            }
                        }

                        return true;
                    },
                    enumerable: true,
                    configurable: true
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

        }, {
            key: '$addComputed',
            value: function $addComputed(key, options) {
                var autoload = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

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

        }, {
            key: '$loadComputed',
            value: function $loadComputed(key) {
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

        }, {
            key: '$setRoot',
            value: function $setRoot($root) {
                var _this4 = this;

                this.$root = $root;
                Object.keys(this.$object).forEach(function (key) {
                    if (_this4.$object[key] instanceof EMVObservable) {
                        _this4.$object[key].$setRoot($root);
                    }
                });
            }

            /**
             * Notify that a modification has been performed on a property to all of it subscribers
             * @param  {string} key      The property name that changed
             * @param  {mixed}  val      The new value of the property
             * @param  {mixed}  oldValue The previous value of the property
             */

        }, {
            key: '$notifySubscribers',
            value: function $notifySubscribers(key, val, oldValue) {
                var _this5 = this;

                if (!key) {
                    return;
                }

                var value = val === undefined ? this[key] : val;

                if (this.$callers[key]) {
                    Object.keys(this.$callers[key]).forEach(function (uid) {
                        var caller = _this5.$callers[key][uid];

                        caller.object[caller.property] = caller.reader(caller.object);
                    });
                }

                if (this.$watchers[key]) {
                    Object.keys(this.$watchers[key]).forEach(function (uid) {
                        _this5.$watchers[key][uid].call(_this5, value, oldValue);
                    });
                }

                if (this.$directives[key]) {
                    this.$directives[key].forEach(function (uid) {
                        var directive = _this5.$root.$directives[uid];

                        if (!directive) {
                            _this5.$directives[key].delete(uid);

                            return;
                        }

                        if (directive && directive.handler.update) {
                            directive.handler.update(directive.element, directive.parameters, directive.model);
                        }
                    });
                }
            }

            /**
             * Override the default valueOf method
             * @returns {Object} The object data
             */

        }, {
            key: 'valueOf',
            value: function valueOf() {
                var _this6 = this;

                var result = {};

                Object.keys(this).forEach(function (key) {
                    result[key] = _this6[key] ? _this6[key].valueOf() : _this6[key];
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

            /**
             * Watch for a property value modification
             * @param  {string} prop    The property name
             * @param  {Function} handler The handler to exute when the property value changes.
             *                            This function get two paramters, newValue and oldValue
             */

        }, {
            key: '$watch',
            value: function $watch(prop, handler) {
                var _this7 = this;

                if (Array.isArray(prop)) {
                    prop.forEach(function (subprop) {
                        _this7.$watch(subprop, handler);
                    });

                    return;
                }

                var propSteps = prop.split('.');
                var finalProp = propSteps.pop();
                var observable = this.$this;

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
             * @param  {string}   prop       The property name
             * @param  {Function} handler    The handler uid to remove from watchers. If not set,
             *                               all watchers on this property are unbound
             */

        }, {
            key: '$unwatch',
            value: function $unwatch(prop, handler) {
                var propSteps = prop.split('.');
                var finalProp = propSteps.pop();
                var observable = this.$this;

                observable = this.$this;

                propSteps.forEach(function (step) {
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
        }]);

        return EMVObservable;
    }();

    /**
     * This class describes the behavior of observable arrays data in EMV engine.
     */


    var EMVObservableArray = function (_EMVObservable) {
        _inherits(EMVObservableArray, _EMVObservable);

        /**
         * Constructor
         * @param  {Object} initValue       The initial value to set on the observable
         * @param  {EMV} $root              The root EMV instance
         * @param  {EMVObservable} $parent  The parent object, containing this one
         * @param  {string} upperKey        The key to retrieve this object from the parent object
         */
        function EMVObservableArray(initValue, $root, $parent, upperKey) {
            _classCallCheck(this, EMVObservableArray);

            var _this8 = _possibleConstructorReturn(this, (EMVObservableArray.__proto__ || Object.getPrototypeOf(EMVObservableArray)).call(this, initValue, $root, $parent, upperKey));

            _this8.$observe('length', initValue.length, upperKey);

            _this8.$watch('length', function () {
                _this8.forEach(function (item, index) {
                    _this8.$observe(index, item, upperKey);
                });
            });
            return _this8;
        }

        /**
         * Override the default valueOf method
         * @returns {Object} The object data
         */


        _createClass(EMVObservableArray, [{
            key: 'valueOf',
            value: function valueOf() {
                return Array.from(this).map(function (item) {
                    return item ? item.valueOf() : item;
                });
            }
        }]);

        return EMVObservableArray;
    }(EMVObservable);

    // Copy the prototype functions from Array to EMVObservableArray prototype


    Object.getOwnPropertyNames(Array.prototype).forEach(function (key) {
        if (!EMVObservableArray.prototype[key]) {
            EMVObservableArray.prototype[key] = Array.prototype[key];
        }
    });

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
        var _this9 = this;

        _classCallCheck(this, EMVComputed);

        this.uid = guid();
        this.object = object;

        var handlers = typeof handler === 'function' ? { read: handler } : handler;

        if (handlers.write) {
            this.writer = function (target, value, oldValue) {
                handlers.write.call(target, value, oldValue);
            };
        }

        if (handlers.read) {
            this.reader = function (target) {
                var previousComputed = object.$root.$executingComputed;

                object.$root.$executingComputed = _this9;

                var value = void 0;

                try {
                    value = handlers.read.call(target);
                } catch (err) {
                    value = undefined;
                }

                object.$root.$executingComputed = previousComputed;

                return value;
            };
        }
    };

    /**
     * This class describes the global behavior of EMV directives
     */


    var EMVDirective = function () {
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
            var _this10 = this;

            _classCallCheck(this, EMVDirective);

            this.name = name;

            var self = this;

            var computeDirectiveMethod = function computeDirectiveMethod(method) {
                if (binder[method]) {
                    _this10[method] = function (element, parameters, model) {
                        var previousDirective = model.$root.$executingDirective;

                        model.$root.$executingDirective = {
                            element: element,
                            parameters: parameters,
                            model: model,
                            handler: self,
                            uid: _this10.getUid(element),
                            name: name
                        };

                        var result = binder[method](element, parameters, model);

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


        _createClass(EMVDirective, [{
            key: 'getUid',
            value: function getUid(element) {
                if (!element.$uid) {
                    element.$uid = guid();
                }

                return element.$uid + '-' + this.name;
            }
        }]);

        return EMVDirective;
    }();

    /**
     * This class describes the bevahior of an EMV instance
     */


    var EMV = function (_EMVObservable2) {
        _inherits(EMV, _EMVObservable2);

        /**
         * Constructor
         * @param {Object} param The initial data of the EMV
         * @param {EMV} $root The root EMV element containing this one
         */
        function EMV(param, $root) {
            _classCallCheck(this, EMV);

            var options = param || {};

            var _this11 = _possibleConstructorReturn(this, (EMV.__proto__ || Object.getPrototypeOf(EMV)).call(this, options.data || options, $root));

            Object.defineProperties(_this11, {
                // Manage the templates
                $templates: {
                    value: {}
                },
                // Manage the executing computed
                $executingComputed: {
                    writable: true,
                    value: null
                },
                // Manage the executing directive
                $executingDirective: {
                    writable: true,
                    value: null
                },
                // Manage if a context is creating
                $creatingContext: {
                    writable: true,
                    value: false
                }
            });

            if (options.computed) {
                Object.keys(options.computed).forEach(function (key) {
                    _this11.$addComputed(key, options.computed[key], false);
                });
            }

            Object.keys(_this11.$computed).forEach(function (key) {
                _this11.$loadComputed(key);
            });
            return _this11;
        }

        /**
         * Apply the instance on a DOM node
         * @param  {DOMNode} element The node to apply the EMV instance on
         */


        _createClass(EMV, [{
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
             * @param {Array} excludes  The directives to not clean
             */

        }, {
            key: '$clean',
            value: function $clean(element, excludes) {
                var _this12 = this;

                var elem = element || this.$rootElement;

                if (!elem) {
                    return;
                }

                if (elem.$directives) {
                    Object.keys(elem.$directives).forEach(function (directive) {
                        if (!excludes || excludes.indexOf(directive) === -1) {
                            var uid = elem.$directives[directive];

                            delete _this12.$directives[uid];
                            delete elem.$directives[directive];
                        }
                    });
                }

                if (elem.children) {
                    Array.from(elem.children).forEach(function (child) {
                        _this12.$clean(child);
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

        }, {
            key: '$registerTemplate',
            value: function $registerTemplate(name, html) {
                // Remove comment from template to be compatible with jquery
                var parsedHtml = html.replace(/<!--(.*?)-->/g, '');

                this.$templates[name] = parsedHtml;
            }

            /**
             * Parse a transformation, to get the name and the parameters of the transformation
             * @param   {string} transformation The transformation expression to parse
             * @returns {Object}                The parse transformation, with the keys 'name', and 'parameters'
             */

        }, {
            key: '$parseDirectiveTransformation',
            value: function $parseDirectiveTransformation(transformation) {
                var match = /^(\w+)(\((.+)\))?$/.exec(transformation);

                if (match) {
                    var name = match[1];
                    var param = '{' + (match[3] || '') + '}';

                    return {
                        name: name,
                        parameters: param
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

        }, {
            key: '$parseHandlebardDirective',
            value: function $parseHandlebardDirective(element, value) {
                var _this13 = this;

                var safeStringRegex = new RegExp(escapeRegExp(EMV.config.delimiters[0]) + '(.+?)' + escapeRegExp(EMV.config.delimiters[1]), 'g');

                var match = value.match(safeStringRegex);

                if (match) {
                    this.$getContext(element.parentNode);

                    var parameters = value.replace(safeStringRegex, function (match, expression) {
                        var steps = expression.split('::').map(function (step) {
                            return step.trim();
                        });

                        var result = steps[0];

                        if (steps.length > 1) {
                            steps.slice(1).forEach(function (transformation) {
                                try {
                                    var transform = _this13.$parseDirectiveTransformation(transformation);

                                    result = '$root.constructor.transformations.' + transform.name + '(' + result + ', ' + transform.parameters + ')';
                                } catch (err) {
                                    throw new EMVError('Error while parsing directive transformation : ' + value);
                                }
                            });
                        }

                        return '\' + ' + result + ' + \'';
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

        }, {
            key: '$parse',
            value: function $parse(element, excludes) {
                var _this14 = this;

                if (element.$directives) {
                    return;
                }

                if (element.nodeName.toLowerCase() === 'template') {
                    // Parse templates
                    this.$registerTemplate(element.id, element.innerHTML);
                    element.parentNode.removeChild(element);
                } else if (element.nodeName.toLowerCase() === '#text') {
                    // Parse raw directives in texts
                    var parameters = this.$parseHandlebardDirective(element, element.textContent);

                    if (parameters !== null) {
                        this.$setElementDirective(element, 'text', '\'' + parameters + '\'');
                    }
                } else if (element.attributes) {
                    // Parse attributes directives
                    Object.keys(EMV.directives).forEach(function (name) {
                        if ((!excludes || excludes.indexOf(name) === -1) && element.getAttribute) {
                            var attribute = EMV.config.attributePrefix + '-' + name;

                            if (element.hasAttribute(attribute)) {
                                var _parameters = element.getAttribute(attribute);
                                var directive = EMV.directives[name];

                                _this14.$getContext(element);
                                _this14.$setElementDirective(element, name, _parameters);

                                if (directive.init) {
                                    directive.init.call(_this14, element, _parameters, _this14);
                                }
                            }
                        }
                    });

                    // Parse raw directives in attributes
                    Array.from(element.attributes).forEach(function (attribute) {
                        var attributeName = attribute.name;
                        var value = attribute.textContent;

                        var attrValue = _this14.$parseHandlebardDirective(element, value);

                        if (attrValue !== null) {
                            var attrDirective = _this14.$directives[element.$directives && element.$directives.attr];
                            var _parameters2 = attrDirective && attrDirective.parameters || '';

                            if (_parameters2) {
                                _parameters2 = _parameters2.substring(1, _parameters2.length - 1) + ',';
                            }

                            _parameters2 += '\'' + attributeName + '\' : \'' + attrValue + '\'';

                            _parameters2 = '{' + _parameters2 + '}';

                            _this14.$setElementDirective(element, 'attr', _parameters2);
                        }
                    });
                }

                if (element.childNodes) {
                    Array.from(element.childNodes).forEach(function (child) {
                        _this14.$parse(child);
                    });
                }
            }

            /**
             * Set a directive on an element
             * @param {DOMNode} element   The element to set a directive on
             * @param {string} name       The directive name
             * @param {string} parameters The directive parameters
             */

        }, {
            key: '$setElementDirective',
            value: function $setElementDirective(element, name, parameters) {
                if (!element.$directives) {
                    element.$directives = {};
                }

                if (!element.$uid) {
                    element.$uid = guid();
                }

                var directive = EMV.directives[name];
                var uid = directive.getUid(element);

                this.$directives[uid] = {
                    name: name,
                    handler: directive,
                    parameters: parameters,
                    model: this,
                    element: element
                };

                element.$directives[name] = uid;
            }

            /**
             * Render a node and all it descendants with declared directives
             * @param  {DOMNode} element The node to render
             * @param {Array} excludes The directives to not render on the element
             */

        }, {
            key: '$render',
            value: function $render(element, excludes) {
                var _this15 = this;

                element.$stopRenderingPropagation = false;

                // Variable to stop to render
                if (element.$directives) {
                    Object.keys(element.$directives).forEach(function (name) {
                        if ((!excludes || excludes.indexOf(name) === -1) && !element.$stopRenderingPropagation) {
                            var uid = element.$directives[name];
                            var directive = _this15.$directives[uid];

                            if (!directive) {
                                return;
                            }

                            var handler = directive.handler;
                            var parameters = directive.parameters;

                            if (handler.bind) {
                                handler.bind.call(_this15, element, parameters, _this15);
                            }

                            if (handler.update) {
                                handler.update.call(_this15, element, parameters, _this15);
                            }
                        }
                    });
                }

                if (!document.documentElement.contains(element)) {
                    return;
                }

                if (!element.$stopRenderingPropagation && element.childNodes) {
                    Array.from(element.childNodes).forEach(function (child) {
                        _this15.$render(child);
                    });
                }
            }

            /**
             * Avoid the render engine to propagate the renderign in element child nodes
             * @param  {DOMNode} element The element
             */

        }, {
            key: '$stopRenderingPropagation',
            value: function $stopRenderingPropagation(element) {
                element.$stopRenderingPropagation = true;
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
                this.$creatingContext = true;

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
                        $root: this,
                        $additionalProperties: new Set([])
                    };
                }

                var additionalProperties = this.$getAdditionalContextProperties(element);

                additionalProperties.forEach(function (key) {
                    if (['$this', '$parent', '$root'].indexOf(key) !== -1) {
                        throw new EMVError('You cannot apply the key \'' + key + '\' as additionnal context property');
                    }

                    context.$additionalProperties.add(key);
                    Object.defineProperty(context, key, {
                        value: (element.parentNode || element.$parent).$context[key],
                        writable: true
                    });
                });

                element.$additionalContextProperties = new Set(additionalProperties);

                if (otherParams) {
                    Object.keys(otherParams).forEach(function (key) {
                        context.$additionalProperties.add(key);

                        Object.defineProperty(context, key, {
                            value: otherParams[key],
                            writable: true
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

        }, {
            key: '$removeContext',
            value: function $removeContext(element) {
                var _this16 = this;

                delete element.$context;

                if (element.children) {
                    Array.from(element.children).forEach(function (child) {
                        _this16.$removeContext(child);
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
                if (!element) {
                    return {};
                }

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

                var parent = element.parentNode || element.$parent;

                if (parent) {
                    var additionalContextProperties = this.$getAdditionalContextProperties(parent);

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

        }, {
            key: '$parseDirectiveGetterParameters',
            value: function $parseDirectiveGetterParameters(parameters) {
                return new Function('$context', 'var $$result;with($context) {$$result=(' + parameters + ');};return $$result;');
            }

            /**
             * Get the value of a directive parameters
             * @param {string} parameters The directive parameters
             * @param {Object} element    The element the directive is applied on
             * @param {Object} context    Force to use this context
             * @returns {mixed}           The calculated value
             */

        }, {
            key: '$getDirectiveValue',
            value: function $getDirectiveValue(parameters, element, context) {
                var _this17 = this;

                var expression = parameters.replace(/\n\s*/g, '');
                var getter = this.$parseDirectiveGetterParameters(expression);
                var realContext = context || this.$getContext(element);

                try {
                    var data = getter(realContext);

                    if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object' && data.$transform && '$data' in data) {
                        if (!Array.isArray(data.$transform)) {
                            data.$transform = [data.$transform];
                        }

                        var value = data.$data;

                        data.$transform.forEach(function (transformation) {
                            var transform = _this17.$parseDirectiveTransformation(transformation);
                            var param = new Function('', 'return ' + transform.parameters + ';');

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

        }, {
            key: '$parseDirectiveSetterParameters',
            value: function $parseDirectiveSetterParameters(parameters) {
                var variable = parameters;
                var match = parameters.match(/\$(?:data|set)\s*:\s*(.+?)\s*[,}]/);

                if (match) {
                    variable = match[1];
                }

                return new Function('$context', '$value', '\n                with($context) {\n                    ' + variable + ' = $value;\n                }\n            ');
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

        }, {
            key: '$insertRemoveElement',


            /**
             * Insert or remove an element from it parent element
             * @param {DOMNode} element     The element to insert or remove form the DOM
             * @param {boolean} value       Defines if the element must be created (true) or removed (false)
             * @param {DOMNode} baseon      The element the one to insert / remove is based on
             * @param {bool}    force       If set to true, and value is set to true,
             *                              then even if the node already exists, it will be inserted
             */
            value: function $insertRemoveElement(element, value, baseon, force) {
                var baseElement = baseon || element;

                if (value) {
                    var createElement = !baseElement.$parent.contains(element) || force;

                    if (createElement) {
                        // Insert the node
                        var before = null;

                        if (element.$before) {
                            element.$before.every(function (node) {
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
        }], [{
            key: 'directive',
            value: function directive(name, binder) {
                this.directives[name] = new EMVDirective(name, binder);
            }

            /**
             * Create a filetr for EMV
             * @param   {string}   name   The filter name
             * @param   {Function} filter The filter method. This functions takes only the value to transform as parameter
             */

        }, {
            key: 'transform',
            value: function transform(name, filter) {
                this.transformations[name] = filter;
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
                Array.from(element.classList).forEach(function (classname) {
                    element.originalClassList.push(classname);
                });
            }

            // Reset the element to it original class list before applying calculated classes
            Array.from(element.classList).forEach(function (classname) {
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
                    var classes = classname.trim().split(/ +/);
                    var classList = element.classList;

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
                    element.style[attr] = '';
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
            element[element.contentEditable === 'true' ? 'onblur' : 'onchange'] = function () {
                var value = void 0;

                var nodeName = element.nodeName.toLowerCase();
                var type = element.type;

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

                            case 'number':
                                value = parseFloat(element.value);
                                if (isNaN(value)) {
                                    value = element.value;
                                }
                                break;

                            case 'date':
                                value = element.value ? new Date(element.value) : null;
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
                        if (element.contentEditable) {
                            value = element.innerHTML;

                            break;
                        }

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

            var nodeName = element.nodeName.toLowerCase();
            var type = element.type;

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

                        case 'date':
                            {
                                if (!(value instanceof Date)) {
                                    value = new Date(value);
                                }

                                var year = value.getFullYear();
                                var month = (value.getMonth() + 1).toString().padStart(2, '0');
                                var date = value.getDate().toString().padStart(2, '0');

                                element.value = year + '-' + month + '-' + date;
                                break;
                            }

                        case 'file':
                            return;

                        default:
                            element.value = value;
                            break;
                    }
                    break;

                case 'textarea':
                    element.value = value;
                    break;

                default:
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
        bind: function bind(element, parameters, model) {
            element.addEventListener('input', function () {
                model.$setDirectiveValue(parameters, element, element.value);
            });
        },
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);
            var start = element.selectionStart;
            var end = element.selectionEnd;

            element.value = value || '';

            if (element.type === 'text') {
                element.setSelectionRange(start, end);
            }
        }
    });

    EMV.directive('focus', {
        bind: function bind(element, parameters, model) {
            element.addEventListener('focus', function () {
                try {
                    model.$setDirectiveValue(parameters, element, true);
                } catch (err) {}
            });

            element.addEventListener('blur', function () {
                try {
                    model.$setDirectiveValue(parameters, element, false);
                } catch (err) {}
            });
        },
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && '$get' in value) {
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
        update: function update(element, parameters, model) {
            if (element.nodeName.toLowerCase() !== 'select') {
                throw new EMVError('options directive can be applied only on select tags');
            }

            var value = model.$getDirectiveValue(parameters, element);
            var options = value.valueOf();

            if (!value) {
                return;
            }

            if ('$data' in value && !value.$data) {
                return;
            }

            if (value.$data) {
                options = {};
                var $data = value.$data.valueOf();

                Object.keys($data).forEach(function (key) {
                    var line = value.$data[key];
                    var optionValue = value.$value ? line[value.$value] : key;
                    var optionLabel = value.$label ? line[value.$label] : line;

                    options[optionValue] = optionLabel;
                });
            }

            // Reset the select
            var currentValue = element.value || value.$selected;

            element.innerHTML = '';

            /**
             * Insert the options tags
             * @param   {string} value The option value
             * @param   {string} label The option label
             */
            function insertOptionTag(value, label) {
                var optionTag = document.createElement('option');

                optionTag.value = value;
                optionTag.innerText = label;
                if (value.toString() === currentValue) {
                    optionTag.selected = true;
                }

                element.appendChild(optionTag);
            }

            Object.keys(options).forEach(function (value) {
                var label = options[value];

                insertOptionTag(value, label);
            });
        }
    });

    /**
     * Content directives
     */
    EMV.directive('text', {
        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            if (element.nodeName === '#text') {
                element.nodeValue = value;
            } else {
                element.innerText = value;
            }
        }
    });

    EMV.directive('html', {
        update: function update(element, parameters, model) {
            var html = model.$getDirectiveValue(parameters, element);

            element.innerHTML = html;

            var scripts = element.querySelectorAll('script');

            Array.from(scripts).forEach(function (script) {
                if (script.innerText) {
                    var func = new Function(script.innerText);

                    func();
                } else {
                    var node = document.createElement('script');

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
            var parser = model.$parseDirectiveGetterParameters(parameters);
            var events = parser(model.$getContext(element));

            if ((typeof events === 'undefined' ? 'undefined' : _typeof(events)) !== 'object') {
                return;
            }

            Object.keys(events).forEach(function (event) {
                var action = events[event];
                var listener = 'on' + event;

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
                event.preventDefault();

                var result = action(model.$getContext(element));

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

        var template = element.innerHTML;
        var templateName = guid();

        element.$templateName = templateName;

        model.$registerTemplate(templateName, template);
    }

    EMV.directive('each', {
        init: function init(element, parameters, model) {
            initElementProperties(element, model);

            element.$clones = [];

            var meta = document.createElement('meta');

            meta.$initialElement = element;
            meta.$uid = element.$uid;
            meta.$context = element.$context;
            meta.setAttribute('name', 'e-each-' + element.$uid);

            model.$setElementDirective(meta, 'each', parameters);

            element.parentNode.replaceChild(meta, element);
        },

        update: function update(meta, parameters, model) {
            var element = meta.$initialElement;
            var param = model.$getDirectiveValue(parameters, element);
            var isObject = false;

            if (!param) {
                // The directive parameters render an empty value, quit the directive
                return;
            }

            var list = param.$data || param;

            if (isPrimitive(list)) {
                return;
            }

            if (Array.isArray(list)) {
                // The input is an array
                // Filter the list
                list = list.filter(function (item) {
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
                var values = Object.keys(list).filter(function (key) {
                    var item = list[key];

                    if (item === undefined || item === null) {
                        return false;
                    }

                    if (param.$filter && !param.$filter(item)) {
                        return false;
                    }

                    return true;
                }).map(function (key) {
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
                    list.sort(function (item1, item2) {
                        return item1[param.$sort] < item2[param.$sort] ? -1 : 1;
                    });
                }
            }

            if (param.$order && param.$order < 0) {
                list.reverse();
            }

            var offset = param.$offset || 0;
            var end = offset + (param.$limit || list.length);

            list = list.slice(offset, end);

            // Remove the nodes that are not present anymore in the list
            var clones = element.$clones.slice();

            clones.forEach(function (clone) {
                if (list.indexOf(clone.$$item) === -1 || !clone.$context) {
                    model.$clean(clone);
                    if (clone.parentNode && clone.parentNode.contains(clone)) {
                        clone.parentNode.removeChild(clone);
                    }
                }
            });
            element.$clones = [];

            // Add new items and move the one that need to be moved
            list.forEach(function (item, index) {
                var itemPreviousIndex = clones.findIndex(function (clone) {
                    return clone.$$item === item;
                });

                var before = element.$clones.slice().reverse().concat(meta).concat(element.$before);

                if (itemPreviousIndex !== -1) {
                    // The item already exists
                    var existingClone = clones[itemPreviousIndex];

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
                var additionalProperties = {
                    $index: isObject ? item.$key : index
                };

                if (param.$item) {
                    additionalProperties[param.$item] = item;
                }

                var clone = element.cloneNode(true);

                clone.$$item = item;

                // Create the sub context for the item
                clone.$parent = element.$parent;
                model.$createContext(clone, item, additionalProperties);

                // Set the elements before the clone
                clone.$before = before;
                // Copy the base element directives on the clone, except 'each', to avoid infinite loop
                Object.keys(element.$directives).forEach(function (name) {
                    if (name !== 'each') {
                        var uid = element.$directives[name];

                        model.$setElementDirective(clone, name, model.$directives[uid].parameters);
                    }
                });

                // Insert the clone
                model.$insertRemoveElement(clone, true, element);

                clone.innerHTML = model.$templates[element.$templateName];

                if (clone.childNodes) {
                    Array.from(clone.childNodes).forEach(function (child) {
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
        init: function init(element, parameters, model) {
            initElementProperties(element, model);
        },

        update: function update(element, parameters, model) {
            var value = Boolean(model.$getDirectiveValue(parameters, element));

            model.$insertRemoveElement(element, value);

            if (value) {
                model.$render(element, ['if']);
            }
        }
    });

    EMV.directive('unless', {
        init: function init(element, parameters, model) {
            initElementProperties(element, model);
        },

        update: function update(element, parameters, model) {
            var value = model.$getDirectiveValue(parameters, element);

            model.$insertRemoveElement(element, !value);

            if (!value) {
                model.$render(element, ['unless']);
            }
        }
    });

    EMV.directive('with', {
        init: function init(element, parameters, model) {
            initElementProperties(element, model);
        },
        update: function update(element, parameters, model) {
            var context = void 0;
            var additionalProperties = {};

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
                    Array.from(element.childNodes).forEach(function (child) {
                        model.$clean(child);
                    });
                }

                element.innerHTML = model.$templates[element.$templateName];

                if (element.childNodes) {
                    Array.from(element.childNodes).forEach(function (child) {
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
        update: function update(element, parameters, model) {
            if (!document.documentElement.contains(element)) {
                return;
            }

            var templateName = model.$getDirectiveValue(parameters, element);

            var template = model.$templates[templateName] || '';

            // Insert the template
            element.innerHTML = template;

            var scripts = element.querySelectorAll('script');

            Array.from(scripts).forEach(function (script) {
                if (script.innerText) {
                    var func = new Function(script.innerText);

                    func();
                } else {
                    var node = document.createElement('script');

                    node.src = script.src;

                    script.parentNode.replaceChild(node, script);
                }
            });

            // Parse and render the content
            if (element.childNodes) {
                Array.from(element.childNodes).forEach(function (child) {
                    model.$parse(child);
                });

                Array.from(element.childNodes).forEach(function (child) {
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
    EMV.transform('upper', function (value) {
        return typeof value === 'string' && value.toUpperCase() || value;
    });

    // Lowercase filter
    EMV.transform('lower', function (value) {
        return typeof value === 'string' && value.toLowerCase() || value;
    });

    // Put the first character upper case, then the following lowercases
    EMV.transform('ucfirst', function (value) {
        if (typeof value !== 'string') {
            return value;
        }

        return value.substr(0, 1).toUpperCase() + value.substr(1);
    });

    // Put each word with a capital first letter
    EMV.transform('ucwords', function (value) {
        if (typeof value !== 'string') {
            return value;
        }

        return value.replace(/(^|\s)(.)/g, function (match, sep, char) {
            return sep + char.toUpperCase();
        });
    });

    // Write the object as JSON
    EMV.transform('json', function (value) {
        return JSON.stringify(value.valueOf());
    });

    // Format a number
    EMV.transform('number', function (value, parameters) {
        if (typeof value !== 'number') {
            return value;
        }

        var result = value;

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
        attributePrefix: 'e',
        delimiters: ['${', '}']
    };

    // Define the version
    Object.defineProperty(EMV, 'version', {
        value: '3.2.4',
        writable: false
    });

    // Utils
    EMV.utils = {
        uid: function uid() {
            return guid();
        }
    };

    // Overwrite Array.isArray function to make EMVObservableArray to return true
    var originalIsArray = Array.isArray;

    Array.isArray = function (variable) {
        if (variable instanceof EMVObservableArray) {
            return true;
        }

        return originalIsArray(variable);
    };

    return EMV;
});
