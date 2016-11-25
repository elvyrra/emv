/* global require */
'use strict';

const fs = require('fs');
const path = require('path');
const chai = require('chai');
const jQuery = require('cheerio');
const jsdom = require('jsdom');
const chaiAsPromised = require('chai-as-promised');
const chaiCheerio = require('chai-cheerio');
const EMV = require('../lib/emv');
const HTMLElement = require('html-element').Element;

global.HTMLElement = HTMLElement;

chai.use(chaiAsPromised);
chai.use(chaiCheerio);
chai.should();

const expect = chai.expect;

const loadPage = (filename) => {
    return new Promise((resolve, reject) => {
        try {
            const html = fs.readFileSync(path.join(__dirname, 'html', filename), 'utf8');

            jsdom.env(html, ['http://code.jquery.com/jquery.js'], (err, window) => {
                if(err) {
                    reject(err);

                    return;
                }

                global.document = window.document;
                global.window = window;

                resolve(window.$);
            });
        }
        catch(err) {
            reject(err);

            return;
        }
    });
};

describe('EMV', () => {
    describe('EMV model-model', () => {
        let emv;

        class Item {
            constructor(name) {
                this.name = name;
            }

            getName() {
                return this.name;
            }
        }

        beforeEach('load a page to get window and document', () => {
            return loadPage('show.html');
        });

        beforeEach('instanciate a new EMV', () => {
            emv = new EMV({
                data : {
                    arr : [
                        {
                            code : 1,
                            label : 'One'
                        },
                        {
                            code : 2,
                            label : 'Two'
                        }
                    ],
                    obj : {
                        action : 'Hello',
                        param : 'World'
                    },
                    items : [
                        new Item('Hello'),
                        new Item('World')
                    ]
                },
                computed : {
                    fullAction : {
                        read : function() {
                            return this.obj.action + ' ' + this.obj.param;
                        },
                        write : function(value) {
                            this.obj.action = value.split(' ')[0];
                            this.obj.param = value.split(' ')[1];
                        }
                    },
                    length : function() {
                        return this.arr.length;
                    }
                }
            });
        });

        it('Check sub object types', () => {
            expect(emv.arr.constructor.name).to.equal('EMVObservableArray');
            expect(emv.obj.constructor.name).to.equal('EMVObservable');

            expect(emv.items.length).to.equal(2);
            expect(emv.items[0].getName()).to.equal('Hello');
            expect(emv.items[1].getName()).to.equal('World');
        });

        it('test readable computed', () => {
            emv.arr.push({
                code : 3,
                label : 'Three'
            });

            expect(emv.length).to.equal(3);
        });

        it('test writable computed', () => {
            emv.fullAction = 'Phone Seb';

            expect(emv.obj.action).to.equal('Phone');
            expect(emv.obj.param).to.equal('Seb');
        });


        it('Test computed based on computed', () => {
            emv = new EMV({
                data : {
                    str : 'Hello'
                },
                computed : {
                    upper : function() {
                        return this.str.toUpperCase();
                    },

                    lower : function() {
                        return this.upper.toLowerCase();
                    }
                }
            });

            expect(emv.upper).to.equal('HELLO');
            expect(emv.lower).to.equal('hello');

            emv.str = 'Hi';

            expect(emv.upper).to.equal('HI');
            expect(emv.lower).to.equal('hi');
        });

        it('watch / unwatch on properties', () => {
            const emv = new EMV({
                data : {
                    str : 'Hello',
                    obj : {
                        text : 'world'
                    }
                }
            });

            function updateStr(value, oldValue) {
                this.str = `new : ${value}; old : ${oldValue}`;
            }

            emv.$watch(['obj.text', 'obj.sub'], updateStr.bind(emv));

            emv.obj.text = 'Garry';

            expect(emv.str).to.equal('new : Garry; old : world');

            emv.obj.sub = 'Hi';

            expect(emv.str).to.equal('new : Hi; old : undefined');

            // Unwatch
            emv.$unwatch('obj.text');

            emv.obj.text = 'Garry';

            expect(emv.str).to.equal('new : Hi; old : undefined');

            emv.$unwatch('obj.sub', updateStr);

            expect(emv.str).to.equal('new : Hi; old : undefined');


            // Watch an unknwon property
            emv.$watch('unknown.str', function(value) {
                this.str = value;
            }.bind(emv));

            emv.unknown = {
                str : 'coucou'
            };

            expect(emv.str).to.not.equal('coucou');
        });

        it('valueOf / toString', () => {
            const emv = new EMV({
                data : {
                    str : 'Hello',
                    obj : {
                        text : 'world'
                    },
                    arr : [
                        {type : 1},
                        2,
                        3
                    ]
                },
                computed : {
                    upper : function() {
                        return this.str.toUpperCase();
                    }
                }
            });

            const expected = {
                str : 'Hello',
                obj : {
                    text : 'world'
                },
                arr : [
                    {type : 1},
                    2,
                    3
                ],
                upper : 'HELLO'
            };

            expect(emv.valueOf()).to.eql(expected);
            expect(emv.toString()).to.eql(JSON.stringify(expected));
            expect(emv.arr.toString()).to.eql(JSON.stringify(expected.arr));

            const emv2 = new EMV({
                str : undefined
            });

            expect(emv2.valueOf()).to.eql({str : undefined});
        });

        it('apply many times an emv instance', () => {
            return loadPage('show.html')

            .then(() => {
                const emv = new EMV({
                    data : {
                        show : false
                    }
                });

                emv.$apply();
                emv.$apply();
            })

            .should.be.rejectedWith('an emv instance cannot be instanciated on multiple DOM elements.');
        });

        it('set an EMV in an EMV', () => {
            let field = new EMV({
                data : {
                    name : 'type'
                }
            });

            let table = new EMV({
                data : {
                    field : field
                }
            });

            field.name = 'id';

            expect(table.field.name).to.equal('id');
        });


        it('$notifySubscribers', () => {
            let fullnameCall = 0;
            let upperNickNameCall = 0;

            const emv = new EMV({
                data : {
                    firstname : 'John',
                    lastname : 'Doe',
                    nickname : 'unknwon'
                },
                computed : {
                    fullname : function() {
                        fullnameCall++;

                        return this.firstname + ' ' + this.lastname;
                    },

                    upperNickName : function() {
                        upperNickNameCall++;

                        return this.nickname.toUpperCase();
                    }
                }
            });

            expect(fullnameCall).to.equal(1);
            expect(upperNickNameCall).to.equal(1);

            emv.$notifySubscribers('firstname');

            expect(fullnameCall).to.equal(2);

            emv.$notifySubscribers('nickname');
            expect(upperNickNameCall).to.equal(2);
        });


        it('check if an EMVObservableArray is considered as Array', () => {
            const emv = new EMV({
                data : {
                    arr : [1, 2, 3]
                }
            });

            expect(Array.isArray(emv.arr)).to.equal(true);
        });
    });

    describe('Directives', () => {
        describe('show directive', () => {
            it('Test show directive', () => {
                return loadPage('show.html')

                .then(($) => {
                    const emv = new EMV({
                        data : {
                            show : false
                        }
                    });

                    emv.$apply();

                    expect($('div').css('display')).to.equal('none');

                    emv.show = true;

                    expect($('div').css('display')).to.equal('block');
                });
            });
        });

        describe('class directive', () => {
            const emv = new EMV({
                data : {
                    class : 'my-class',
                    class3 : false,
                    class4 : true
                }
            });

            it('Test scalar class', () => {
                return loadPage('class.html')

                .then(($) => {
                    emv.$apply();

                    expect($('#one-class')).to.have.class('class1');
                    expect($('#one-class')).to.have.class('my-class');

                    emv.class = 'your-class';
                    expect($('#one-class')).to.not.have.class('my-class');
                    expect($('#one-class')).to.have.class('your-class');

                    delete emv.class;
                    expect($('#one-class').attr('class')).to.equal('class1');
                });
            });

            it('Test object class', () => {
                return loadPage('class.html')

                .then(($) => {
                    emv.$apply();

                    expect($('#many-classes')).to.have.class('class2');
                    expect($('#many-classes')).to.have.class('class4');
                    expect($('#many-classes')).to.not.have.class('class3');


                    emv.class3 = true;
                    expect($('#many-classes')).to.have.class('class4');
                    expect($('#many-classes')).to.have.class('class3');
                });
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('style directive', () => {
            const emv = new EMV({
                data : {
                    color : 'red',

                    obj : {
                        color : 'green',
                        weight : 'bold'
                    }
                }
            });

            it('scalar style', () => {
                return loadPage('style.html')

                .then(($) => {
                    emv.$apply();

                    expect($('#scalar-style').css('background-color')).to.equal('');
                });
            });

            it('object style', () => {
                return loadPage('style.html')

                .then(($) => {
                    emv.$apply();

                    expect($('#object-style').css('background-color')).to.equal('green');
                    expect($('#object-style').css('font-weight')).to.equal('bold');

                    emv.obj.color = 'blue';

                    expect($('#object-style').css('background-color')).to.equal('blue');

                    delete emv.obj.weight;

                    expect($('#object-style').css('font-weight')).to.equal('');
                });
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('attr directive', () => {
            let emv;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        editable : false,
                        toggle : 'tooltip',
                        placement : 'top'
                    }
                });
            });

            it('object attr', () => {
                return loadPage('attr.html')

                .then(($) => {
                    emv.$apply();

                    expect($('#object-attr').attr('contenteditable')).to.be.undefined;

                    emv.editable = true;

                    expect($('#object-attr').attr('contenteditable')).to.equal('true');
                });
            });

            it('object attr', () => {
                return loadPage('attr.html')

                .then(($) => {
                    emv.$apply();

                    expect($('#inline-attr').attr('contenteditable')).to.equal('false');

                    emv.editable = true;

                    expect($('#inline-attr').attr('contenteditable')).to.equal('true');
                });
            });

            it('string attr', () => {
                return loadPage('attr.html')

                .then(($) => {
                    emv.$apply();

                    expect($('#string-attr').attr('contenteditable')).to.be.unedefined;

                    emv.editable = true;

                    expect($('#string-attr').attr('contenteditable')).to.be.unedefined;
                });
            });

            it('mixed attr', () => {
                return loadPage('attr.html')

                .then(($) => {
                    emv.$apply();

                    expect($('#mixed-attr').attr('data-toggle')).to.equal('tooltip');
                    expect($('#mixed-attr').attr('data-placement')).to.equal('top');

                    emv.placement = 'bottom';

                    expect($('#mixed-attr').attr('data-placement')).to.equal('bottom');
                });
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('disabled directive', () => {
            it('disabled', () => {
                return loadPage('disabled.html')

                .then(($) => {
                    const emv = new EMV({
                        data : {
                            disabled : false
                        }
                    });

                    emv.$apply($('input').get(0));

                    expect($('input').attr('disabled')).to.be.undefined;

                    emv.disabled = true;

                    expect($('input').attr('disabled')).to.equal('disabled');
                });
            });

        });

        describe('value directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        text : 'Hello',
                        checkbox : false,
                        radio : 0,
                        select : 1,
                        textarea : '',
                        other : '',
                        editable : ''
                    }
                });

                return loadPage('value.html')

                .then((jquery) => {
                    $ = jquery;
                    $('#editable').get(0).contentEditable = 'true';

                    emv.$apply();

                });
            });

            it('bind text input', () => {
                $('#text-value').val('Hi man').trigger('change');

                expect(emv.text).to.equal('Hi man');
            });

            it('update text input', () => {
                emv.text = 'Youyou';

                expect($('#text-value').val()).to.equal(emv.text);
            });

            it('update text input deleting value', () => {
                delete emv.text;

                expect($('#text-value').val()).to.equal('');
            });

            it('bind checkbox input', () => {
                $('#checkbox-value').get(0).checked = true;
                $('#checkbox-value').trigger('change');

                expect(emv.checkbox).to.equal(true);
            });

            it('update checkbox input', () => {
                emv.checkbox = true;

                expect($('#checkbox-value').is(':checked')).to.equal(true);
            });

            it('bind radio input', () => {
                $('input[name="radio"][value="1"]').attr('checked', true).trigger('change');

                expect(emv.radio).to.equal('1');
            });

            it('update radio input', () => {
                emv.radio = 3;

                expect($('input[name="radio"]:checked').val()).to.equal('3');
            });

            it('bind select box', () => {
                $('#select-value').val('2').trigger('change');

                expect(emv.select).to.equal('2');
            });

            it('update select box', () => {
                emv.select = 2;

                expect($('#select-value').val()).to.equal('2');
            });

            it('bind textarea', () => {
                $('#textarea-value').val('Hello').trigger('change');

                expect(emv.textarea).to.equal('Hello');
            });

            it('update textarea', () => {
                emv.textarea = 'Hello';

                expect($('#textarea-value').val()).to.equal('Hello');
            });

            it('update contenteditable div element', () => {
                emv.editable = 'Hello';

                expect($('#editable').get(0).innerHTML).to.equal('Hello');
            });

            it('bind contenteditable div element', () => {
                $('#editable').get(0).innerHTML = 'coucou';
                $('#editable').get(0).onblur();

                expect(emv.editable).to.equal('coucou');
            });

            it('bind other element', () => {
                $('#other-value').val('Hello').trigger('change');

                expect(emv.other).to.equal('');
            });

            it('update other element', () => {
                emv.other = 'Hello';

                expect($('#other-value').get(0).value).to.equal('Hello');
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('input directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        text : '',
                    }
                });

                return loadPage('input.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('bind text input', () => {
                $('input').val('e');
                $('input').get(0).dispatchEvent(new window.Event('input'));

                expect(emv.text).to.equal('e');
            });

            it('update text input', () => {
                emv.text = 'Hello';

                expect($('input').val()).to.equal('Hello');
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('focus directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        focus : false
                    }
                });

                return loadPage('focus.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('bind input', () => {
                $('input').get(0).focus();

                expect(emv.focus).to.equal(true);

                $('input').get(0).blur();

                expect(emv.focus).to.equal(false);
            });

            it('update text input', () => {
                emv.focus = true;

                expect($('input').is(':focus')).to.equal(true);

                emv.focus = false;

                expect($('input').is(':focus')).to.equal(false);
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('options directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        options : [
                            {
                                value : 1,
                                label : 'one'
                            },
                            {
                                value : 2,
                                label : 'two'
                            }
                        ],

                        simpleOptions : [
                            'one',
                            'two'
                        ],

                        objectOptions : {
                            1 : 'one',
                            2 : 'two'
                        }
                    }
                });

                return loadPage('options.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });



            it('update select options with complexe array of objects', () => {
                expect($('#array-options option').length).to.equal(2);
                expect($('#array-options option').get(0).value).to.equal('1');
                expect($("#array-options option").get(0).innerText).to.equal('one');

                expect($('#array-options option').get(1).value).to.equal('2');
                expect($('#array-options option').get(1).innerText).to.equal('two');

                $('#array-options').get(0).value = '2';

                emv.options.push({
                    value : 3,
                    label : 'three'
                });

                expect($('#array-options option').length).to.equal(3);
                expect($('#array-options option').get(2).value).to.equal('3');
                expect($('#array-options option').get(2).innerText).to.equal('three');

                expect($('#array-options').val()).to.equal('2');
            });

            it('update select options with simple array', () => {
                expect($('#simple-options option').length).to.equal(2);
                expect($('#simple-options option').get(0).value).to.equal('0');
                expect($("#simple-options option").get(0).innerText).to.equal('one');

                expect($('#simple-options option').get(1).value).to.equal('1');
                expect($('#simple-options option').get(1).innerText).to.equal('two');

                emv.simpleOptions.push('three');

                expect($('#simple-options option').length).to.equal(3);
                expect($('#simple-options option').get(2).value).to.equal('2');
                expect($('#simple-options option').get(2).innerText).to.equal('three');

                delete emv.simpleOptions;

                expect($('#simple-options option').length).to.equal(3);
            });

            it('update select options with simple object', () => {
                expect($('#object-options option').length).to.equal(2);
                expect($('#object-options option').get(0).value).to.equal('1');
                expect($("#object-options option").get(0).innerText).to.equal('one');

                expect($('#object-options option').get(1).value).to.equal('2');
                expect($('#object-options option').get(1).innerText).to.equal('two');

                emv.objectOptions[3] = 'three';

                expect($('#object-options option').length).to.equal(3);
                expect($('#object-options option').get(2).value).to.equal('3');
                expect($('#object-options option').get(2).innerText).to.equal('three');
            });

            it('Apply options directive on a non select elemen', () => {
                return loadPage('options-error.html')

                .then(() => {
                    emv.$clean();
                    emv.$apply();
                })

                .should.be.rejectedWith('options directive can be applied only on select tags');
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('text directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        text : 'Hello',
                        text2 : 'World'
                    }
                });

                return loadPage('text.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check text directive', () => {
                emv.text = 'Hi';
                emv.text2 = 'Garry';

                expect($('#attr').get(0).innerText).to.equal('Hi');
                expect($('#inline').get(0).innerHTML).to.equal('<i e-class="text" class="Hi"></i>Garry');
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('html directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        text : 'Hello'
                    }
                });

                return loadPage('html.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check html directive', () => {
                emv.text = '<b>Hi</b>';

                expect($('#attr').get(0).innerHTML).to.equal(emv.text);
            });

            it.skip('check html directive with inline script', () => {
                emv.text = '<b>Hi</b><script>$("#to-remove").remove();</script>';

                expect($('#attr').get(0).innerHTML).to.equal(emv.text);
                expect($('#to-remove').length).to.equal(0);
            });

            it('check html directive with scripttag with src attribute', () => {
                emv.text = '<b>Hi</b><script src="test.js"></script>';

                expect($('#attr').get(0).innerHTML).to.equal(emv.text);
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('click directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        id : 0
                    }
                });

                emv.click = function() {
                    this.id ++;
                }.bind(emv);

                return loadPage('click.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check click directive', () => {
                $('button').trigger('click');
                expect(emv.id).to.equal(1);

                $('button').trigger('click');
                expect(emv.id).to.equal(2);
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('on directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        id : 0
                    }
                });

                emv.click = function() {
                    this.id ++;
                }.bind(emv);

                return loadPage('on.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check on directive', () => {
                $('button').trigger('click');
                expect(emv.id).to.equal(1);

                $('button').trigger('click');
                expect(emv.id).to.equal(2);

                $('span').trigger('click');
                expect(emv.id).to.equal(2);
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('submit directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        id : 0
                    }
                });

                emv.submit = function() {
                    this.id ++;
                }.bind(emv);

                return loadPage('submit.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check submit directive', () => {
                $('form').get(0).dispatchEvent(new window.Event('submit'));
                expect(emv.id).to.equal(1);

                $('form').get(0).dispatchEvent(new window.Event('submit'));
                expect(emv.id).to.equal(2);
            });

            it('apply submit directive on a non form element', () => {
                return loadPage('submit-error.html')

                .then(() => {
                    emv.$clean();
                    emv.$apply();
                })

                .should.be.rejectedWith('submit directive can be applied only on form tags');
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('each directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        list : [
                            {label : 'one'},
                            {label : 'two'}
                        ]
                    }
                });

                emv.filter = (item) => {
                    return item.label !== 'one';
                };

                emv.sort = (item1, item2) => {
                    return item1.label < item2.label ? -1 : 1;
                };

                return loadPage('each.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check each directive', () => {
                expect($('li').length).to.equal(2);
                expect($('li').get(0).innerText).to.equal('one');
                expect($('li').get(1).innerText).to.equal('two');

                emv.list.push({
                    label : 'three'
                });

                expect($('li').length).to.equal(3);
                expect($('li').get(0).innerText).to.equal('one');
                expect($('li').get(1).innerText).to.equal('two');
                expect($('li').get(2).innerText).to.equal('three');

                emv.list.splice(0, 1);
                expect($('li').length).to.equal(2);
                expect($('li').get(0).innerText).to.equal('two');
                expect($('li').get(1).innerText).to.equal('three');
            });

            it('check each directive with filter, sort, order and item', () => {
                emv.list.push({
                    label : 'three'
                });

                emv.list.push({
                    label : 'four'
                });

                emv.list.push({
                    label : 'five'
                });

                expect($('div').length).to.equal(4);
                expect($('span').get(0).innerText).to.equal('two');
                expect($('span').get(1).innerText).to.equal('three');
                expect($('span').get(2).innerText).to.equal('four');
                expect($('span').get(3).innerText).to.equal('five');
            });

            it('check each directive with sort function', () => {
                emv.list.push({
                    label : 'three'
                });

                emv.list.push({
                    label : 'four'
                });

                emv.list.push({
                    label : 'five'
                });

                expect($('button').length).to.equal(5);
                expect($('button').get(0).innerText).to.equal('five');
                expect($('button').get(1).innerText).to.equal('four');
                expect($('button').get(2).innerText).to.equal('one');
                expect($('button').get(3).innerText).to.equal('three');
                expect($('button').get(4).innerText).to.equal('two');
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('if directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        if : false
                    }
                });

                return loadPage('if.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check if directive', () => {
                expect($('span').length).to.equal(0);

                emv.if = true;

                expect($('span').length).to.equal(1);
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('unless directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        unless : false
                    }
                });

                return loadPage('unless.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check if directive', () => {
                expect($('span').length).to.equal(1);

                emv.unless = true;

                expect($('span').length).to.equal(0);
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('with directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        obj : {
                            text : 'Hello'
                        }
                    }
                });

                return loadPage('with.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check with directive', () => {
                expect($('div').get(0).innerText).to.equal('Hello');

                emv.obj.text = 'Hi';

                expect($('div').get(0).innerText).to.equal('Hi');

                expect($('span').get(0).innerText).to.equal('Hi');

                expect($('ul').length).to.equal(0);

                emv.obj2 = {
                    comments : [
                        {text : 'coucou'},
                        {text : 'coucou2'},
                        {text : 'coucou3'}
                    ]
                };

                expect($('ul').length).to.equal(1);
                expect($('li').length).to.equal(3);
            });

            it('Apply the emv on the element that have the with directive', () => {
                emv.$clean();
                emv.$apply($('div').get(0));

                expect($('div').get(0).innerText).to.equal('Hello');

                emv.obj.text = 'Hi';

                expect($('div').get(0).innerText).to.equal('Hi');
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });

        describe('template directive', () => {
            let emv, $;

            beforeEach(() => {
                emv = new EMV({
                    data : {
                        template : 'none',
                        text : 'Hello'
                    }
                });

                return loadPage('template.html')

                .then((jquery) => {
                    emv.$apply();

                    $ = jquery;
                });
            });

            it('check template directive', () => {
                expect($('span').length).to.equal(0);

                emv.template = 'my-template';

                expect($('span').get(0).innerText).to.equal('Hello');

                // expect($('#to-remove').length).to.equal(0);

                expect($('#wrapper script').length).to.equal(2);
            });

            afterEach('clean emv binding', () => {
                emv.$clean();
            });
        });
    });

    describe('utils', () => {
        it('uid', () => {
            let x = EMV.utils.uid(),
                y = EMV.utils.uid();

            expect(x).to.not.equal(y);
        });
    });
});
