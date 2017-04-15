/* global expect */
'use strict';

const utils = require('../utils');

describe('with directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                obj : {
                    text : 'Hello'
                },
                obj2 : undefined
            }
        });

        return utils.loadPage('with.html')

        .then((jquery) => {

            $ = jquery;
        });
    });

    it('check with directive', () => {
        emv.$apply();
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
        emv.$apply($('div').get(0));

        expect($('div').get(0).innerText).to.equal('Hello');

        emv.obj.text = 'Hi';

        expect($('div').get(0).innerText).to.equal('Hi');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});