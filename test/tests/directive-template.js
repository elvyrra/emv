/* global expect */
'use strict';

const utils = require('../utils');

describe('template directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                template : 'none',
                text : 'Hello'
            }
        });

        return utils.loadPage('template.html')

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