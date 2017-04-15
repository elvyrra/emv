/* global expect, EMV */
'use strict';

const utils = require('../utils');

describe('number transformation', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            value : 123456.654,
            text : 'hello'
        });

        return utils.loadPage('transform-number.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check number transformation', () => {
        expect($("#simple").text()).to.equal('123456.654');
        expect($("#full").text()).to.equal('123 456,65');
        expect($("#attr").val()).to.equal('123 456,65');
        expect($("#e-attr").val()).to.equal('123 456,65');
        expect($('#wrong').text()).to.equal('hello');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});