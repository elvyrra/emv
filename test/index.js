/* global require */
'use strict';

const fs = require('fs');
const path = require('path');
const chai = require('chai');
const jquery = require('cheerio');

const chaiAsPromised = require('chai-as-promised');
const chaijQuery = require('chai-jquery');
global.Proxy = require('harmony-proxy');
const EMV = require('../lib/emv');

chai.use(chaiAsPromised);
chai.use(chaijQuery);
chai.should();

const expect = chai.expect;

var $, emv;

describe('EMV', () => {
    before('Load the page', (done) => {
        fs.readFile(path.join(__dirname, 'html', 'index.html'), 'utf8', (err, html) => {
            if(err) {
                done(err);

                return;
            }

            $ = jquery.load(html);

            done();
        });
    });

    it('instanciate a EMV', (done) => {
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

        emv = new EMV({
            data : {
                show : false,
                class : '',
                borderColor : 'black',
                submit : function() {
                    console.log(this.borderColor);
                },

                contenteditable : false,
                disabled : true,
                focus : false,
                content : 'Salut',


                colorize : function(data) {
                    data.borderColor = 'orange';
                },

                options : [
                    {
                        code : '1',
                        label : 'Salut'
                    },
                    {
                        code : '2',
                        label : 'Coucou'
                    }
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

                if : false,

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
                fulltext2 : ''
            }
        });

        expect(emv.show).to.equal(false);

        expect(emv.Root.children.length).to.equal(2);

        expect(emv.Root.children[1].extension).to.equal('avi');

        done();
    });

    it('show directive', () => {
        emv.show = true;

        expect($('h1')).to.be.visible;

        emv.show = false;

        expect($('h1')).to.be.hidden;
    });
});
