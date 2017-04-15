/* global expect, EMV */
'use strict';

const utils = require('../utils');

describe('lower transformation', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                value : 'HelLo',
                number : 12
            }
        });

        return utils.loadPage('transform-lower.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check lower transformation', () => {
        expect($('#text').text()).to.equal('hello');
        expect($('#attr').val()).to.equal('hello');
        expect($('#e-attr').val()).to.equal('hello');

        expect($('#wrong').text()).to.equal('12');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});