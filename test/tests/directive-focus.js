/* global expect */
'use strict';

const utils = require('../utils');

describe('focus directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                focus : false
            }
        });

        return utils.loadPage('focus.html')

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