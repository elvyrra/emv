/* global expect */
'use strict';

const utils = require('../utils');

describe('click directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                id : 0
            }
        });

        emv.click = function() {
            this.id ++;
        }.bind(emv);

        return utils.loadPage('click.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check click directive', () => {
        $('button').trigger('click');
        expect(emv.id).to.equal(1);

        $('button').trigger('click');
        expect(emv.id).to.equal(2);
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});