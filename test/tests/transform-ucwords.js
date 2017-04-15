/* global expect, EMV */
'use strict';

const utils = require('../utils');

describe('ucwords transformation', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                value : 'hi everybody',
                number : 12
            }
        });

        return utils.loadPage('transform-ucwords.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check ucwords transformation', () => {
        expect($('#text').text()).to.equal('Hi Everybody');
        expect($('#attr').val()).to.equal('Hi Everybody');
        expect($('#e-attr').val()).to.equal('Hi Everybody');
        expect($('#wrong').text()).to.equal('12');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});