/* global expect */
'use strict';

const utils = require('../utils');

describe('options directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            options : [
                {
                    value : 1,
                    label : 'one'
                },
                {
                    value : 2,
                    label : 'two'
                }
            ],

            simpleOptions : [
                'one',
                'two'
            ],

            objectOptions : {
                1 : 'one',
                2 : 'two'
            }
        });

        return utils.loadPage('options.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });



    it('update select options with complexe array of objects', () => {
        expect($('#array-options option').length).to.equal(2);
        expect($('#array-options option').get(0).value).to.equal('1');
        expect($("#array-options option").get(0).innerText).to.equal('one');

        expect($('#array-options option').get(1).value).to.equal('2');
        expect($('#array-options option').get(1).innerText).to.equal('two');

        $('#array-options').get(0).value = '2';

        emv.options.push({
            value : 3,
            label : 'three'
        });

        expect($('#array-options option').length).to.equal(3);
        expect($('#array-options option').get(2).value).to.equal('3');
        expect($('#array-options option').get(2).innerText).to.equal('three');

        expect($('#array-options').val()).to.equal('2');
    });

    it('update select options with simple array', () => {
        expect($('#simple-options option').length).to.equal(2);
        expect($('#simple-options option').get(0).value).to.equal('0');
        expect($("#simple-options option").get(0).innerText).to.equal('one');

        expect($('#simple-options option').get(1).value).to.equal('1');
        expect($('#simple-options option').get(1).innerText).to.equal('two');

        emv.simpleOptions.push('three');

        expect($('#simple-options option').length).to.equal(3);
        expect($('#simple-options option').get(2).value).to.equal('2');
        expect($('#simple-options option').get(2).innerText).to.equal('three');

        delete emv.simpleOptions;

        expect($('#simple-options option').length).to.equal(3);
    });

    it('update select options with simple object', () => {
        expect($('#object-options option').length).to.equal(2);
        expect($('#object-options option').get(0).value).to.equal('1');
        expect($("#object-options option").get(0).innerText).to.equal('one');

        expect($('#object-options option').get(1).value).to.equal('2');
        expect($('#object-options option').get(1).innerText).to.equal('two');

        emv.objectOptions[3] = 'three';

        expect($('#object-options option').length).to.equal(2);
    });

    it('Apply options directive on a non select elemen', () => {
        return utils.loadPage('options-error.html')

        .then(() => {
            emv.$clean();
            emv.$apply();
        })

        .should.be.rejectedWith('options directive can be applied only on select tags');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});