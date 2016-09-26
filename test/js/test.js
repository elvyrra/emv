/* global EMV */

'use strict';

EMV.config.delimiters = ['${', '}'];
EMV.config.htmlDelimiters = ['!{', '}'];

class Item extends EMV {
    constructor(data) {
        super({
            data : data,
            computed : {
                extension : function() {
                    return this.name.split('.').pop();
                },
                isFolder : function() {
                    return this.type === 'folder';
                }
            }
        });
    }
}

var obj = new EMV({
    data : {
        show : false,
        classname : '',
        borderColor : 'black',
        submit : function() {
            window.alert(this.borderColor);
        },

        contenteditable : false,
        disabled : true,
        focus : false,
        content : 'Salut',


        colorize : function(data) {
            data.borderColor = 'orange';
        },

        options : [
            { code : '1', label : 'Salut'},
            { code : '2', label : 'COucou'}
        ],

        selected : '1',

        newOption : {
            code : '',
            label : '',
            add : function(data) {
                data.$parent.options.push({
                    code : data.code,
                    label : data.label
                });

                data.code = '';
                data.label = '';
            }
        },

        display : false,

        Root : new Item({
            type : 'folder',
            name : 'Root',
            children : [
                new Item({
                    name : 'folder',
                    type : 'folder',
                    children : [
                        new Item({
                            name : 'toto.png',
                            size : 654,
                            type : 'file'
                        }),
                        new Item({
                            name : 'titi.jpg',
                            size : 789,
                            type : 'file'
                        })
                    ]
                }),
                new Item({
                    name : 'garry.avi',
                    size : 789,
                    type : 'file'
                })
            ]
        }),

        fulltext : '',
        fulltext2 : '',

        firstname : 'Seb',
        lastname : 'Lecocq'
    },
    computed : {
        fullname : {
            read : function() {
                return this.firstname + ' ' + this.lastname;
            },
            write : function(value) {
                let tmp = value.split(' ', 2);

                this.firstname = tmp[0];
                this.lastname = tmp[1];
            }
        }
    }
});

obj.$apply();