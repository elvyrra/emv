/* global expect */
'use strict';

const utils = require('../utils');

describe('if directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                if : false
            }
        });

        return utils.loadPage('if.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check if directive', () => {
        expect($('span').length).to.equal(0);

        emv.if = true;

        expect($('span').length).to.equal(1);
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});