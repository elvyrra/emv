/* global expect */
'use strict';

const utils = require('../utils');

describe('style directive', () => {
    const emv = new EMV({
        data : {
            color : 'red',

            obj : {
                color : 'green',
                weight : 'bold'
            }
        }
    });

    it('scalar style', () => {
        return utils.loadPage('style.html')

        .then(($) => {
            emv.$apply();

            expect($('#scalar-style').css('background-color')).to.equal('');
        });
    });

    it('object style', () => {
        return utils.loadPage('style.html')

        .then(($) => {
            emv.$apply();

            expect($('#object-style').css('background-color')).to.equal('green');
            expect($('#object-style').css('font-weight')).to.equal('bold');

            emv.obj.color = 'blue';

            expect($('#object-style').css('background-color')).to.equal('blue');

            emv.obj.weight = undefined;

            expect($('#object-style').css('font-weight')).to.equal('');
        });
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});