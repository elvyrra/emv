/* global expect, EMV */
'use strict';

const utils = require('../utils');

describe('json transformation', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                value : {
                    text : 'Hello'
                }
            }
        });

        return utils.loadPage('transform-json.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check json transformation', () => {
        expect($('#text').text()).to.equal('{"text":"Hello"}');
        expect($('#attr').val()).to.equal('{"text":"Hello"}');
        expect($('#e-attr').val()).to.equal('{"text":"Hello"}');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});