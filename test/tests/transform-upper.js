/* global expect, EMV */
'use strict';

const utils = require('../utils');

describe('upper transformation', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                value : 'HelLo',
                number : 12
            }
        });

        return utils.loadPage('transform-upper.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check upper transformation', () => {
        expect($('#text').text()).to.equal('HELLO');
        expect($('#attr').val()).to.equal('HELLO');
        expect($('#e-attr').val()).to.equal('HELLO');
        expect($('#wrong').text()).to.equal('12');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});