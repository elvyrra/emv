/* global expect */
'use strict';

const utils = require('../utils');

describe('focus directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            focus1 : false,
            focus2 : false
        });

        return utils.loadPage('focus.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('bind input', () => {
        $('#bind-update').get(0).focus();

        expect(emv.focus1).to.equal(true);

        $('#bind-update').get(0).blur();

        expect(emv.focus1).to.equal(false);

        $('#only-updating').get(0).focus();
        expect(emv.focus2).to.equal(false);
    });

    it('update text input', () => {
        emv.focus1 = true;
        expect($('#bind-update').is(':focus')).to.equal(true);
        emv.focus1 = false;
        expect($('#bind-update').is(':focus')).to.equal(false);

        emv.focus2 = true;
        expect($('#only-updating').is(':focus')).to.equal(true);
        emv.focus2 = false;
        expect($('#only-updating').is(':focus')).to.equal(false);
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});