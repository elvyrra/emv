/* global expect */
'use strict';

const utils = require('../utils');

describe('attr directive', () => {
    let emv;

    beforeEach(() => {
        emv = new EMV({
            data : {
                editable : false,
                toggle : 'tooltip',
                placement : 'top'
            }
        });
    });

    it('object attr', () => {
        return utils.loadPage('attr.html')

        .then(($) => {
            emv.$apply();

            expect($('#object-attr').attr('contenteditable')).to.be.undefined;

            emv.editable = true;

            expect($('#object-attr').attr('contenteditable')).to.equal('true');
        });
    });

    it('object attr', () => {
        return utils.loadPage('attr.html')

        .then(($) => {
            emv.$apply();

            expect($('#inline-attr').attr('contenteditable')).to.equal('false');

            emv.editable = true;

            expect($('#inline-attr').attr('contenteditable')).to.equal('true');
        });
    });

    it('string attr', () => {
        return utils.loadPage('attr.html')

        .then(($) => {
            emv.$apply();

            expect($('#string-attr').attr('contenteditable')).to.be.unedefined;

            emv.editable = true;

            expect($('#string-attr').attr('contenteditable')).to.be.unedefined;
        });
    });

    it('mixed attr', () => {
        return utils.loadPage('attr.html')

        .then(($) => {
            emv.$apply();

            expect($('#mixed-attr').attr('data-toggle')).to.equal('tooltip');
            expect($('#mixed-attr').attr('data-placement')).to.equal('top');

            emv.placement = 'bottom';

            expect($('#mixed-attr').attr('data-placement')).to.equal('bottom');
        });
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});