# EMV v3.2.0
EMV is a JavaScript data-bind system. You could say "Again another one ?". But the differences with other systems that exsists are :

* EMV is very light, and powerful. Comparely to other systems, when a variable is modified, only concerned nodes are woken and not all the view.
* EMV is ONLY a MVVM system, not integrating a whole framework. It means too, that you can use EMV with other frameworks used for other usecases (data management, Websockets, ...).
* The weight of EMV is lighter that any existing system (19,5 Ko in it minified version).

The goal when developping EMV was to group what is very useful in each existing system like knockout, angular, vuejs, and reject what it is not.

# Install

Download EMV, and integrate it in your project :

## Legacy
```html
<script type="text/javascript" src="path/to/emv.min.js"></script>
```

## Require AMD
```javascript
require.config({
    paths : {
        emv : 'path/to/emv.min'
    },
    shim : {
        emv : {
            exports : ['EMV']
        }
    }
});

require(['emv'], (EMV) => {
    ...
});
```

## NodeJS project
```javascript
const emv = require('emv');
```


# First example
`index.html`
```html
<html>
    <script type="text/javascript" src="./emv.min.js"></script>
    <script type="text/javascript" src="test.js"></script>
    <body>
        <h1>${title}</h1>

        <input id="firstname" type="text" e-value="firstname" />
        <input id="lastname" type="text" e-value="lastname" />

        <div id="fullname"> ${fullname} </div>
    </body>
</html>

```


`test.js`
```javascript
const emv = new EMV({
    data : {
        title : 'Contact page',
        firstname : 'John',
        lastname : 'Doe'
    },
    computed : {
        fullname : function() {
            return this.firstname + ' ' + this.lastname;
        }
    }
});

emv.$apply();
```

This code will :
* Display the value of emv.title in the `h1` tag as a text (HTML tags are escaped)
* Bind the `input#firstname` to emv.firstname
* Bind the `input#lastname`to emv.lastname
* Display the value of emv.fullname in the `div#fullname`
* When the value of emv.firstname or emv.lastname is modified, the value of emv.fullname is automatically calculated

# Create an EMV instance

To create an EMV object, you can :

* Instanciate directly EMV, as in the previous sample. EMV constructor takes one parameter as input, which must be an Object, with the keys :

    * `Object` 'data' (mandatory) : This defines the initial data of your EMV instance
    * `Object` 'computed' : The computed you want to declare in your EMV instance. Computed are explaied in [Computed Section](#computed)

* Create a class that extends EMV, then instanciate it. It can be useful if you want to integrate EMV objects in an EMV instance

#<a name="computed"></a>Computed

A computed is a property of your EMV instance, depends on the value of other properties.
To get the value of the computed, you just have to call emv[prop], like any other property.

There are tow types of computed :
* The readonly computed
* The writeable computed

## Readonly computed
A readonly computed is, like its name indicates, a property that can be only read. That's EMV that writes the value of this property, when the value
of a propertiy the computed depends on is modified.

To declare a readonly computed in an EMV instance, you must to decalre it in the property 'computed' of the EMV constructor object argument :
```javascript
const emv = new EMV({
    data : {
        title : 'Contact page',
        firstname : 'John',
        lastName : 'Doe'
    },
    computed : {
        fullname : function() {
            return this.firstname + ' ' + this.lastname;
        }
    }
});
```

Here, the property **fullname** is declared as a readonly computed, depending on the properties **firstname** and **lastname**. Properties a computed depends on
are automatically calculated by EMV.

## Writeable computed
A writeable computed can be written by a processus, and then execute some actions when the value is modified. The example below explains how to declare and use writeable computeds :

```javascript
const emv = new EMV({
    data : {
        title : 'Contact page',
        firstname : 'John',
        lastName : 'Doe'
    },
    computed : {
        fullname : {
            read : function() {
                return this.firstname + ' ' + this.lastname;
            },
            write : function(value, oldValue) {
                this.firstname = value.split(' ')[0];
                this.lastname = value.split(' ')[1];

                if(oldValue) {
                    this.oldFullname = oldValue;
                }
            }
        }
    }
});

console.log(emv.oldFullname); // undefined

emv.fullname = 'Jim Morrison';

console.log(emv.firstname); // 'Jim'
console.log(emv.lastname); // 'Morrison'
console.log(emv.oldFullname); // 'John Doe'
```


# Bind to your view
Use the method `EMV.prototype.$apply(element)` to bind a view to your EMV instance :

```javascript
const emv = new EMV({
    data : {...}
});

emv.$apply(document.getElementById('my-emv-view'));
```

To apply the instance on the body :
```javascript
emv.$apply();
```

# Directives

## Predefined directives

### Nodes attributes directives

### e-show : Display / Show the node where it is applicated
```html
<div e-show="show"></div>
```

### e-class : Apply / Remove classes on the node
```html
<div e-class="classname"></div>
```
**classname** must be a string in the model

```html
<div e-class="'my-class-' + id"></div>
```
**id** can be a string or a number

Alternative notations :
```html
<div e-class="{'myclass' : myclass, 'class-2' : class2}"></div>
```
**myclass** and **class2** must be boolean in the model

### e-style : Add CSS properties to the node
```html
<div e-style="{background-color': color}"></div>
```

### e-attr : Set / remove attributes to the node
```html
<input e-attr="{id : id}" />
<label e-attr="{for : id}">Label</label>
```


### e-disabled : Enable / Disable the node
```html
<input type="text" e-disabled="disabled" />
```
**disabled** must be a boolean in the binded object

### Form and inputs directives
### e-value
The directive **e-value** can be applied on the inputs, selectboxes, and textarea. It is a two-way data-binding, i.e
* When the value is modified in the view, then the value is modified in the model
* When the value is modified in the model, then the value is modified in the view

```html
<input type="text" e-value="text" />
<input type="checkbox" e-value="checked" />

<input type="radio" name="radio" value="0" e-value="radio" />
<input type="radio" name="radio" value="1" e-value="radio" />
<input type="radio" name="radio" value="2" e-value="radio" />
<input type="radio" name="radio" value="3" e-value="radio" />

<select e-value="select">
    <option value="1">one</option>
    <option value="2">two</option>
    <option value="3">three</option>
</select>

<textarea e-value="fulltext"></textarea>
```

### e-input
The directive **e-input** can be applied on the inputs, selectboxes, and textarea. It is a two-way data-binding, i.e
* When the 'input' events is triggerde on the view element, then the value is modified in the model
* When the value is modified in the model, then the value is modified in the view

```html
<input type="text" e-input="text" />
<div e-text="text"></div>
```

### e-focus
The directive **e-focus** can be applied on the inputs, selectboxes, and textarea. It is a two-way data-binding, i.e
* When the view element is focused or blured, then the model value is modified (respectively true and false)
* When the value is modified in the model, then the element is focused or blured

```html
<input type="text" e-focus="focus" />
```

In some cases, it is possible that the getter and setter are different, it is possible to write something like that :

```html
<input type="text" e-focus="{$get : variable === 'value', $set : focus}" />
```

Note : If you want to apply a function on the focus event, you will have to use the directive e-on :
```html
<input type="text" e-focus="variable === 'value'" e-on="{focus : method}" />
```



### e-options : Update the options on a select tag
The directive **e-option** is used to update the options of a `select` tag. It can be applied only on a `select` tag.
Many notations are possible for this directive

1. The simple directive
```html
<select e-options="optionsArray"></select>
<select e-options="optionsObject"></select>
```

```javascript
const emv = new EMV({
    data : {
        optionsArray : [
            'one',
            'two',
            'three'
        ],
        optionsObject : {
            1 : 'one',
            2 : 'two',
            3 : three
        }
    }
});

emv.$apply();
```

2. The complex directive
```html
<select e-options="{$data : options, $value : 'code', $label : 'label'}"></select>
```

```javascript
const emv = new EMV({
    data : {
        options : [
            {
                code : 'FR',
                label : 'France'
            },
            {
                code : 'EN',
                label : 'England'
            },
            {
                code : 'US',
                label : 'United States of America'
            }
        ]
    }
});

emv.$apply();
```


### Content directives
### e-text : Display text (html encoded)
```html
<p e-text="text"></p>
```

### e-html : Display HTML
<div e-html="html"></div>

### Events directives
### e-click : Execute an action on click event
```html
<button e-click="click"></button>
```

```javascript
const emv = new EMV({
    data : {
        click : function() {
            alert('clicked');
        }
    }
});

emv.$apply();
```

### e-submit : Execute an action on submit event (on forms)
```html
<form e-submit="submit">
    <input type="submit" />
</form>
```

```javascript
const emv = new EMV({
    data : {
        submit : function() {
            alert('submitted');
        }
    }
});

emv.$apply();
```

### e-on : Defines actions for a set of events
```html
<div e-on="{click: click, mouseover : mouseover}"></div>
```

```javascript
const emv = new EMV({
    data : {
        click : function() {
            alert('click');
        },
        mouseover : function() {
            console.log('mouseover');
        }
    }
});

emv.$apply();
```

### DOM manipulation directives
### e-each : Display the node for each element in the given array
This directive can have two different notations :

1. The simple notation
```html
<ul>
    <li e-each="item" e-text="label"></li>
</ul>
```

```javascript
const emv = new EMV({
    data : {
        list : [
            {label : 'France'},
            {label : 'England'},
            {label : 'Germany'}
        ]
    }
});

emv.$apply();
```

2. The complex notation
The directive can be written as an object that can contain the following properties :
    * **$data** (mandatory) : The array or object used to loop
    * **$filter** : The name of a function to filter the list
    * **$sort** : This can be a function name or a string representing a property of listed objects
    * **$order** (is used is defined) : If set to -1, the the list will be descending ordered
    * **$offset** : The index of the first element to display
    * **$limit** : The maximum elements to display
    * **$item** : A string that represents the name of each object in the list in their child nodes
Moreover, a property ($index) is created each object context in the list, representing the index og the object in the list

Examples :
```html
<ul>
    <li e-each="{$data : list, $filter : filter, $sort : 'label', $order : -1, $offset : 1, $limit : 3, $item : 'country'">
        #${$index} <span e-text="country.label"></span> (${$this.code})
    </li>
</ul>
```

```javascript
const emv = new EMV({
    data : {
        list : [
            {code : 'FR', label : 'France'},
            {code : 'EN', label : 'England'},
            {code : 'IT', label : 'Italy'},
            {code : 'DE', label : 'Germany'},
            {code : 'ES', label : 'Spain'}
        ],

        filter : function(item) {
            return item.label !== 'Italy';
        }
    }
});

emv.$apply();
```

The result will be :
```html
<ul>
    <li>#0 <span>Germany (DE)</span></li>
    <li>#1 <span>France (FR)</span></li>
    <li>#2 <span>England (EN)</span></li>
</ul>

```

**NOTE** : You can use '$this' in a directive to refer the current element context (All referers are explained in [Referers](#referers))


### e-if : Display / Remove the node
```html
<div e-if="condition"></div>
```


### e-unless : Display / Remove the node on negative condition
```html
<div e-unless="condition"></div>
```
Equivalent to

```html
<div e-if="!condition"></div>
```

### e-with : Create a sub context in the children nodes
This directive is used to create a sub context on the node and it children. An example will be more explicit :

```javascript
const emv = new EMV({
    data : {
        obj : {
            first : 'Hello',
            last : 'World'
        }
    }
});

emv.$apply();
```

```html
<div e-with="obj">
    <span e-text="first"></span> <span e-text="$this.last"></span>
</div>
```

Another alternative notation is available, if you want to name the object in the sub context :
```html
<div e-with="{$data : obj, $as : 'contact'}">
    <span e-text="first"></span> <span e-text="contact.last"></span>
</div>
```


### e-template : Display the content of a template
```html
<template id="my-template">
    <span e-text="first"></span> <span e-text="$this.last"></span>
</template>

<div e-with="obj" e-template="'my-template'"></div>
```

## Handlebars directive
Two particular directives exist in EMV, that we called 'handlebars directives'. They are not defined as attributes, by directly in the code, to display text, HTML or update node attributes


### Display text : ${}
This directive can be writter in a text node to display a text, or in a tag decalaration to update attributes. Example :

```html
<div class='class1 clas2 ${class3}'> ${text} </div>
```


## Referers
Three referers are availables in each node, and can be used in directives parameters :
* $this : Refers the current context
* $root : Refers the emv instance applied on the DOM
* $parent : Refers the parent element of the current context


## Create your custom directives
EMV allows you to create your own directives, using the method EMV.directive(name, handler); As you can see, it is a static method of EMV,
it means that when you create a directive, it will be accessible for each EMV instance you create and apply on the DOM.

### How to declare a directive ?
A directive is declared with the method EMV.directive(name, handler);

```javascript
EMV.directive('my-directive', {
    init : function(element, parameters, model) {},
    bind : function(element, parameters, model) {},
    update : function(element, parameters, model) {}
});
```

The object **handler** can contains three methods **init**, **bind** and **update**. To understand the role of each of these methods,
I'll first explain how a DOM is rendered :

When executing $apply method, the DOM is parsed, it means directives are searched on each DOM node, their parameters are parsed and the directives
are registered in memory. Then the method $render is executed to render the DOM.

* **init** : This method is executed when parsing the DOM, to initialize meta data to render the DOM
* **bind** : This method is exeucted when rendering the DOM. It is generally used to bind the Dom events to the model
* **update** : This method is executed each time the model values this directive depends on are modified to update the DOM node

Each of these methods takes three arguments :
* **element** : The element the diretive is applied on
* **parameters** : The directive parameters
* **model** : The model applied on the DOM (EMV instance)


# Transformations (included in v3.0.0)
Transformations are functions that can be applied in a directive to transform the value to display. A quick example,
if you want to display a variable with uppercase, you can write something like that :
```html
<span e-text="{$data : myVar, $transform : 'upper'}"></span>
```

## Syntax
Two syntaxes are availables to write a transformation in your view :

### The directive syntax
As in the example below, you can write :
```html
<span e-text="{$data : expression, $transform : 'upper'}"></span>
```

### The handlebars syntax
Transformations can also be written in handlebars directive, with the following syntax :
```html
<span>${myvar :: upper}</span>
```
### Transformations with parameters
Some transformations can take parameters, like the transformation 'number', which will be described later. To specify
parameters in a transformation, the syntax is the following :
```html
<span>${myvar :: number(decimals : 2, thousandSep : ' ')}</span>
```

And in an attribute directive :
```html
<span e-text="{$data : expression, $transform : 'number(decimals : 2, thousandSep : \' \')'}"></span>
```
### Chained transformations :
It is possible to apply several transformations on a directive value, chaining the like this :
```html
<span>${myvar :: json :: upper}</span>
```

And in an attribute directive :

```html
<span e-text="{$data : expression, $transform : ['json', 'upper']}"></span>
```

The transformations wil be applied in the order they are written

## Predefined transformations
### upper : Display the value upper case
```html
<span>${value :: upper}</span>
```

### lower : Display the value lower case
```html
<span>${value :: lower}</span>
```

### ucfirst : Display the first letter upper case
```html
<span>${value :: ucfirst}</span>
```

### ucwords : Display the first letter of each word
```html
<span>${value :: ucwords}</span>
```

### json : Display the value notation of the value
```html
<span>${value :: json}</span>
```

### number : Format a number
```html
<span>${value :: number(decimals : 2, thousandSep : ' ', decimalSep : ',')}</span>
```
This transformation accepts 3 parameters :
* decimals : The number of decimals to display
* thousandSep : The character separating the thousands
* decimalSep : The character separating the integer and the decimal part of the number

## Create your custom transformation
EMV allows you to create your own transformations, using the method EMV.transform(name, handler). As for directives, it is a static
method, it means that your transformation will be accessible in each EMV instance you create and apply on the DOM

#### How to declare a transformation
A transformation is declared with the method EMV.transform(name, handler);

```javascript
EMV.transform('my-transformation', function(value, parameters) {
    ...
});
```

The **handler** method contains two parameters :
* value (mandatory) : The input value to transform
* parameters (optionnal) : An object contaning the parameters the transformation can use

It returns the result of the transformation.

Example : The **upper** transformation
```javascript
EMV.transform('upper', (value) => {
    return typeof value === 'string' && value.toUpperCase() || value;
});
```

# EMV API

## EMV(param)
* description : Constructor
* parameters :
    * param (Object) : The initial data of the EMV instance

## EMV.prototype.$watch(prop, handler)
* description : Watch for modifications on model property(ies) **prop**, and executes the **handler** function
* parameters :
    * prop (String | Array) : Defines the propety to watch. It can define a sub object property, separating each level by a '.'. If an array is given, the watcher will be applied on each property if this array
    * handler (Function) : The function to execute when the watched property value changes
* Examples :
 ```javascript
 const emv = new EMV({
     data : {
         obj : {
             first : 'Hello',
             last : 'World'
         }
     }
 });

 emv.$watch(['obj.first', 'obj.last'], function(value, oldValue) {
     console.log('Changed from ' + oldValue + ' to ' + value);
 });
 ```

## EMV.prototype.$unwatch(prop[, handler])
* description : Unwatch modifications on a property
* parameters :
    * prop (String | Array) : Defines the property to unwatch.
    * handler (Function) : The function to execute when the watched property value changes. If not set, all the watchers on the property are unwatched

## EMV.prototype.$notifySubscribers([key[, value[, oldValue]]])
* description : This method is used to force property subscribers (watchers, directives, computed) to be executed. This method has to be used in emergency cases, to avoid infinit loops.
Note that this function can be applied on sub objects of an EMV instance.

* parameters :
    * key (String) : The key of the object to notify. if not set, all the object propreties are notified
    * value : The property value. If not set the current property value is taken
    * oldValue : The previous property value.

## EMV.prototype.$apply([element])
* description : Apply the model on a DOM Node
* parameters :
    * element (DOMNode) : The element to apply the model on. If not set, the body is taken

## EMV.prototype.$clean([element])
* description : Stop binding the EMV instance with the view
* parameters :
    * element (DOMNode) : The element to unbind. It not set, the body is taken

## EMV.prototype.$cleanDirectives(element)
* description : Clean the directives declared on a DOM element
* parameters :
    * element (DOMNode) : The element to clean the directives on

## EMV.prototype.$parse(element[, excludes])
* description : Parse the directives in the view
* parameters :
    * element (DOMNode) : The element to parse
    * excludes (Array) : The directives to not parse

## EMV.prototype.$render(element[, excludes])
* description : Parse the view
* parameters :
    * element (DOMNode) : The element to render
    * excludes (Array) : The directives to not render

## EMV.prototype.$createContext(element, object[, otherParams])
* description : Create a context for a given view element
* parameters :
    * element (DOMNode) : The element to create the context on
    * object (Object) : The object to apply as context
    * otherParams : Additionnal parameters to add to the context (used in e-each directive to add $index and $item properties to child nodes contexts)

## EMV.prototype.$removeContext(element)
* description : Remove the context of an element
* parameters :
    * element (DOMNode) : The element to remove the context on

## EMV.prototype.$getContext(element)
* description : Get the context of an element
* parameters :
    * element (DOMNode) : The element to get the context
* returns (Object) : The contect of the element

## EMV.prototype.$parseDirectiveGetterParameters(parameters)
* description : Parse directive parameters an returns a function to get the value in the directive context
* parameters :
    * parameters (String) : The directive parameters (attribute value)
* Returns (Function) The getter function

## EMV.prototype.$getDirectiveValue(parameters, element[, context])
* description : Get the value of a directive in the element context
* parameters :
    * parameters (String) : The directive parameters
    * element (DOMNode) : The element the directive is applied on
    * context (Object) : Can be used to override the default element context
* Returns the value of the directive parameters on the element

## EMV.prototype.$parseDirectiveSetterParameters(parameters)
* description : Parse directive parameters an returns a function to set the value in the model
* parameters :
    * parameters (String) : The directive parameters (attribute value)
* Returns (Function) The setter function

## EMV.prototype.$setDirectiveValue(parameters, element, value)
* description : Set a value in the model, depending on the element and the directive parameters
* parameters :
    * parameters (String) : The directive parameters
    * element (DOMNode) : The element the directive is applied on
    * value : The value to set in the model

## (static) EMV.directive(name, handler)
* description : Create a directive on EMV
* parameters :
    * name (String) : The directive name
    * handler (Object) : The directives data bind methods

## (static) EMV.transform(name, handler)
* description : Create a transformation on EMV
* parameters :
    * name (String) : The transformation name
    * handler (Object) : The transformation parameters

## (static) EMV.config
This object contains the following properties :

| Property | Default | Description |
|---|---|---|
| attributePrefix | `'e-'` | The prefix for directives attributes |
| delimiters | `['${', '}']` | The delimiters used to parse text handlebars directives |

## (static readonly) EMV.version
Defines the EMV engin version



# Known issues
1. In directives, if use variable which name is a JavaScript reserved word, you need to prefix it by $this. For example, you cannot write :
 ```html
 <span e-if="if"></span>
 ```
 but you need to write :
 ```html
 <span e-if="$this.if"></span>
 ```