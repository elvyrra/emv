/* global expect */
'use strict';

const utils = require('../utils');

describe('disabled directive', () => {
    it('disabled', () => {
        return utils.loadPage('disabled.html')

        .then(($) => {
            const emv = new EMV({
                data : {
                    disabled : false
                }
            });

            emv.$apply($('input').get(0));

            expect($('input').attr('disabled')).to.be.undefined;

            emv.disabled = true;

            expect($('input').attr('disabled')).to.equal('disabled');
        });
    });

});