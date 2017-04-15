/* global expect, EMV */
'use strict';

const utils = require('../utils');

describe('chain transformations', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                value : {
                    text : 'hello'
                }
            }
        });

        return utils.loadPage('transform-chain.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check chained transformations', () => {
        expect($('#text').text()).to.equal('{"TEXT":"HELLO"}');
        expect($('#attr').val()).to.equal('{"TEXT":"HELLO"}');
        expect($('#e-attr').val()).to.equal('{"TEXT":"HELLO"}');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});