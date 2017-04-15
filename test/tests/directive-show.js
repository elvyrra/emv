/* global expect */
'use strict';

const utils = require('../utils');

describe('show directive', () => {
    it('Test show directive', () => {
        return utils.loadPage('show.html')

        .then(($) => {
            const emv = new EMV({
                data : {
                    show : false
                }
            });

            emv.$apply();

            expect($('div').css('display')).to.equal('none');

            emv.show = true;

            expect($('div').css('display')).to.equal('block');
        });
    });
});