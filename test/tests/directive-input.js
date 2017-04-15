/* global expect */
'use strict';

const utils = require('../utils');

describe('input directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                text : '',
            }
        });

        return utils.loadPage('input.html')

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