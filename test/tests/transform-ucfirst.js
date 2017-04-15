/* global expect, EMV */
'use strict';

const utils = require('../utils');

describe('ucfirst transformation', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                value : 'heLLO',
                number : 12
            }
        });

        return utils.loadPage('transform-ucfirst.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check ucfirst transformation', () => {
        expect($('#text').text()).to.equal('HeLLO');
        expect($('#attr').val()).to.equal('HeLLO');
        expect($('#e-attr').val()).to.equal('HeLLO');
        expect($('#wrong').text()).to.equal('12');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});