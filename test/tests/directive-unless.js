/* global expect */
'use strict';

const utils = require('../utils');

describe('unless directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                unless : false
            }
        });

        return utils.loadPage('unless.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check if directive', () => {
        expect($('span').length).to.equal(1);

        emv.unless = true;

        expect($('span').length).to.equal(0);
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});