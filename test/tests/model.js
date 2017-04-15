/* global expect */
'use strict';

const utils = require('../utils');

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
        return utils.loadPage('show.html');
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

    it('computed should return undefined', () => {
        emv = new EMV({
            data : {
                str : 'Hello'
            },
            computed : {
                upper : function() {
                    return this.string.toUpperCase()
                }
            }
        });

        expect(emv.upper).to.be.undefined;
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

        // Obj.sub is not binded, expect str to not change
        emv.obj.sub = 'Hi';

        expect(emv.str).to.equal('new : Garry; old : world');

        // Unwatch
        emv.$unwatch('obj.text');

        emv.obj.text = 'Fred';

        expect(emv.str).to.equal('new : Garry; old : world');

        emv.$unwatch('obj.sub', updateStr);

        expect(emv.str).to.equal('new : Garry; old : world');


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
        return utils.loadPage('show.html')

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