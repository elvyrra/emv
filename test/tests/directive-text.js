/* global expect, EMV */
'use strict';

const utils = require('../utils');

describe('text directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                text : 'Hello',
                text2 : 'World'
            }
        });

        return utils.loadPage('text.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check text directive', () => {
        emv.text = 'Hi';
        emv.text2 = 'Garry';

        expect($('#attr').get(0).innerText).to.equal('Hi');
        expect($('#inline').get(0).innerHTML).to.equal('<i e-class="text" class="Hi"></i>Garry');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});