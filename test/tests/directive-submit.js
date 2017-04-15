/* global expect */
'use strict';

const utils = require('../utils');

describe('submit directive', () => {
    let emv, $;

    beforeEach(() => {
        emv = new EMV({
            data : {
                id : 0
            }
        });

        emv.submit = function() {
            this.id ++;
        }.bind(emv);

        return utils.loadPage('submit.html')

        .then((jquery) => {
            emv.$apply();

            $ = jquery;
        });
    });

    it('check submit directive', () => {
        $('form').get(0).dispatchEvent(new window.Event('submit'));
        expect(emv.id).to.equal(1);

        $('form').get(0).dispatchEvent(new window.Event('submit'));
        expect(emv.id).to.equal(2);
    });

    it('apply submit directive on a non form element', () => {
        return utils.loadPage('submit-error.html')

        .then(() => {
            emv.$clean();
            emv.$apply();
        })

        .should.be.rejectedWith('submit directive can be applied only on form tags');
    });

    afterEach('clean emv binding', () => {
        emv.$clean();
    });
});
