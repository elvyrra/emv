/* global expect */
'use strict';

const utils = require('../utils');

describe('html directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                text : 'Hello'
            }
        });

        return utils.loadPage('html.html')

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